import * as THREE from "three";
import * as PixiUI from "./ui/PixiUI.js";
import { playChicken, playCow, playPopup } from "./sounds.js";
import { tutorialStep, setPlantedCell } from "./tutorial.js";
import {
  STARTING_MONEY, ITEM_DEFS, ITEM_ICONS, CROP_DEFS, ANIMAL_DEFS, GRID,
} from "./config.js";
import {
  cellState, tileMeshes, itemMeshes,
  isCrop, isAnimal, getCellKey,
  isFullyGrown, isAnimalReady,
  setTileMat, clearTutorialLock,
} from "./grid.js";
import { spawnMesh, removeCellMesh } from "./assets.js";

export let money = STARTING_MONEY;
export const storage = { corn: 0, tomato: 0, strawberry: 0, egg: 0, milk: 0 };

let _advance = null;
let _onStorageChange = null;
export function initFarm(advanceFn, onStorageChange = null) {
  _advance = advanceFn;
  _onStorageChange = onStorageChange;
}

export function addMoney(amount) {
  money += amount;
  PixiUI.updateMoneyHUD(money);
}

export function renderMoney() {
  PixiUI.updateMoneyHUD(money);
}

export function updateStorageUI() {
  PixiUI.updateStoragePanel(storage);
  _onStorageChange?.();
}

export function createGrowthLabel(row, col) { PixiUI.createGrowthLabel(`${row}_${col}`); }
export function removeGrowthLabel(row, col) { PixiUI.removeGrowthLabel(`${row}_${col}`); }

export function updateGrowthLabelContent(row, col) {
  const state = cellState[row][col];
  if (!state) return;
  const key = `${row}_${col}`;

  if (isCrop(state.key)) {
    const ready    = isFullyGrown(row, col);
    const progress = ready ? 1 : Math.min(
      (Date.now() - state.startTime) / 1000 / CROP_DEFS[state.key].productionTime, 1,
    );
    PixiUI.updateGrowthLabel(key, ready, progress, true);
  } else if (isAnimal(state.key)) {
    const ready    = isAnimalReady(row, col);
    const progress = ready ? 1 : Math.min(
      (Date.now() - state.startTime) / 1000 / ANIMAL_DEFS[state.key].productionTime, 1,
    );
    PixiUI.updateGrowthLabel(key, ready, progress, false);
  }
}

export function harvestCell(row, col) {
  const state = cellState[row][col];
  if (!state || !isCrop(state.key) || !isFullyGrown(row, col)) return;

  storage[state.key] = (storage[state.key] || 0) + 1;
  playPopup();
  updateStorageUI();

  state.stage     = 0;
  state.startTime = Date.now();
  removeCellMesh(row, col);
  spawnMesh(CROP_DEFS[state.key].stages[0], row, col);
  setTileMat(row, col);
  updateGrowthLabelContent(row, col);

  if (tutorialStep() === "harvest") {
    clearTutorialLock();
    _advance?.("car_wait");
  }
}

export function collectAnimal(row, col) {
  const state = cellState[row][col];
  if (!state || !isAnimal(state.key) || !isAnimalReady(row, col)) return;

  const product = ANIMAL_DEFS[state.key].product;
  storage[product] = (storage[product] || 0) + 1;
  if (state.key === "chicken") playChicken();
  else if (state.key === "cow") playCow();

  updateStorageUI();
  state.startTime = Date.now();
  setTileMat(row, col);
  updateGrowthLabelContent(row, col);
}

export function placeItem(row, col, name) {
  const def     = ITEM_DEFS.find((d) => d.key === name);
  const prevKey = getCellKey(row, col);
  const prevDef = ITEM_DEFS.find((d) => d.key === prevKey);
  const refund  = prevDef?.price ?? 0;
  const cost    = name ? Math.max(0, (def?.price ?? 0) - refund) : 0;

  if (name && money < cost) return;

  if (itemMeshes[row][col]) {
    removeCellMesh(row, col);
    money += refund;
  }
  removeGrowthLabel(row, col);
  money -= cost;
  renderMoney();

  if (!name) {
    cellState[row][col] = null;
  } else if (isCrop(name)) {
    cellState[row][col] = { key: name, stage: 0, startTime: Date.now() };
    spawnMesh(CROP_DEFS[name].stages[0], row, col);
    createGrowthLabel(row, col);
    updateGrowthLabelContent(row, col);
  } else {
    cellState[row][col] = { key: name, startTime: Date.now() };
    spawnMesh(name, row, col);
    createGrowthLabel(row, col);
    updateGrowthLabelContent(row, col);
  }
  setTileMat(row, col);

  if (name === "corn" && tutorialStep() === "corn") {
    setPlantedCell({ row, col });
    PixiUI.clearShopLock();
    PixiUI.setShopCloseLocked(false);
    _advance?.("grow");
  }
}

export function tickGrowth() {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const state = cellState[row][col];
      if (!state || !isCrop(state.key)) continue;

      const cropDef  = CROP_DEFS[state.key];
      const maxStage = cropDef.stages.length - 1;
      if (state.stage >= maxStage) continue;

      const stageTime = cropDef.productionTime / maxStage;
      const elapsed   = (Date.now() - state.startTime) / 1000;
      const newStage  = Math.min(Math.floor(elapsed / stageTime), maxStage);

      if (newStage > state.stage) {
        state.stage = newStage;
        removeCellMesh(row, col);
        spawnMesh(cropDef.stages[newStage], row, col);
        if (newStage === maxStage) {
          setTileMat(row, col);
          if (tutorialStep() === "grow") _advance?.("harvest");
        }
      }
      updateGrowthLabelContent(row, col);
    }
  }
}

export function tickAnimals() {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const state = cellState[row][col];
      if (!state || !isAnimal(state.key)) continue;
      updateGrowthLabelContent(row, col);
      if (isAnimalReady(row, col)) setTileMat(row, col);
    }
  }
}

const _labelPos = new THREE.Vector3();

export function updateAllLabelPositions(camera) {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const key = `${row}_${col}`;
      if (!PixiUI.hasGrowthLabel(key)) continue;
      const tile = tileMeshes[row][col];
      _labelPos.set(tile.position.x, 0.9, tile.position.z);
      _labelPos.project(camera);
      PixiUI.positionGrowthLabel(
        key,
        (_labelPos.x *  0.5 + 0.5) * innerWidth,
        (_labelPos.y * -0.5 + 0.5) * innerHeight,
      );
    }
  }
}

export function iconImg(key, size = 22) {
  const src = ITEM_ICONS[key];
  return src
    ? `<img src="${src}" class="item-icon" style="width:${size}px;height:${size}px">`
    : key;
}
