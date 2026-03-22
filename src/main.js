import * as THREE from "three";
import * as PixiUI from "./ui/PixiUI.js";
import { playBg, playClick, playChicken, playCow, playPopup, toggleMute, isMuted } from "./sounds.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  GRID,
  CELL,
  PITCH,
  ORIGIN,
  SKY_COLOR,
  FOG_DENSITY,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_POS,
  CTRL_DAMPING,
  CTRL_MIN_DIST,
  CTRL_MAX_DIST,
  CTRL_MIN_POLAR,
  CTRL_MAX_POLAR,
  CTRL_ENABLE_PAN,
  CTRL_ENABLE_ROTATE,
  CTRL_ENABLE_ZOOM,
  CTRL_PAN_MIN,
  CTRL_PAN_MAX,
  AMBIENT_COLOR,
  AMBIENT_INTENSITY,
  SUN_COLOR,
  SUN_INTENSITY,
  SUN_POS,
  SUN_SHADOW_SIZE,
  SUN_SHADOW_NEAR,
  SUN_SHADOW_FAR,
  SUN_SHADOW_EXTENT,
  SUN_SHADOW_BIAS,
  TONE_EXPOSURE,
  GROUND_COLOR,
  GROUND_SIZE,
  GROUND_Y,
  TILE_HEIGHT,
  TILE_COLOR_DEFAULT,
  TILE_COLOR_HOVER,
  TILE_COLOR_SELECTED,
  TILE_COLOR_OCCUPIED,
  TILE_COLOR_READY,
  STARTING_MONEY,
  ANIMAL_DEFS,
  ITEM_ICONS,
  ITEM_DEFS,
  CROP_DEFS,
  GARDEN_SCALE,
  GARDEN_POS,
  FOREST_SCALE,
  FOREST_POSITIONS,
  ROAD_Z,
  ROAD_WIDTH,
  ROAD_LENGTH,
  CAR_ENTER_X,
  CAR_EXIT_X,
  SERVICE_X,
  QUEUE_GAP,
  MAX_QUEUE,
  CAR_SPEED,
  SPAWN_MIN,
  SPAWN_MAX,
  CAR_Y,
  CAR_ROTATION_Y,
  CAR_SCALE,
  CAR_LABEL_Y,
  CAR_WISH_MIN_TYPES,
  CAR_WISH_MAX_TYPES,
  CAR_WISH_MIN_QTY,
  CAR_WISH_MAX_QTY,
  SELL_PRICES,
  CAR_COLORS,
} from "./config.js";

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_EXPOSURE;

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.FogExp2(SKY_COLOR, FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  innerWidth / innerHeight,
  CAMERA_NEAR,
  CAMERA_FAR,
);
camera.position.set(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z);
camera.lookAt(0, 0, 0);

function applyControlsSettings(c) {
  c.enableDamping = true;
  c.dampingFactor = CTRL_DAMPING;
  c.minDistance = CTRL_MIN_DIST;
  c.maxDistance = CTRL_MAX_DIST;
  c.minPolarAngle = CTRL_MIN_POLAR;
  c.maxPolarAngle = CTRL_MAX_POLAR;
  c.enablePan = CTRL_ENABLE_PAN;
  c.enableRotate = CTRL_ENABLE_ROTATE;
  c.enableZoom = CTRL_ENABLE_ZOOM;
}

let controls = new OrbitControls(camera, renderer.domElement);
applyControlsSettings(controls);
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
sun.position.set(SUN_POS.x, SUN_POS.y, SUN_POS.z);
sun.castShadow = true;
sun.shadow.mapSize.set(SUN_SHADOW_SIZE, SUN_SHADOW_SIZE);
sun.shadow.camera.near = SUN_SHADOW_NEAR;
sun.shadow.camera.far = SUN_SHADOW_FAR;
sun.shadow.camera.left = sun.shadow.camera.bottom = -SUN_SHADOW_EXTENT;
sun.shadow.camera.right = sun.shadow.camera.top = SUN_SHADOW_EXTENT;
sun.shadow.bias = SUN_SHADOW_BIAS;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
  new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);

const cellState = Array.from({ length: GRID }, () => Array(GRID).fill(null));
const tileMeshes = [];
const itemMeshes = [];

const tileGeo = new THREE.BoxGeometry(CELL, TILE_HEIGHT, CELL);
const MAT_DEFAULT = new THREE.MeshLambertMaterial({
  color: TILE_COLOR_DEFAULT,
});
const MAT_HOVER = new THREE.MeshLambertMaterial({ color: TILE_COLOR_HOVER });
const MAT_SELECTED = new THREE.MeshLambertMaterial({
  color: TILE_COLOR_SELECTED,
});
const MAT_OCCUPIED = new THREE.MeshLambertMaterial({
  color: TILE_COLOR_OCCUPIED,
});
const MAT_READY = new THREE.MeshLambertMaterial({ color: TILE_COLOR_READY });

for (let row = 0; row < GRID; row++) {
  tileMeshes.push([]);
  itemMeshes.push([]);
  for (let col = 0; col < GRID; col++) {
    const mesh = new THREE.Mesh(tileGeo, MAT_DEFAULT.clone());
    mesh.position.set(ORIGIN + col * PITCH, 0, ORIGIN + row * PITCH);
    mesh.receiveShadow = true;
    mesh.userData = { row, col };
    scene.add(mesh);
    tileMeshes[row].push(mesh);
    itemMeshes[row].push(null);
  }
}

let selectedCell = null;
let hoveredCell = null;

function isFullyGrown(row, col) {
  const s = cellState[row][col];
  return s && isCrop(s.key) && s.stage >= CROP_DEFS[s.key].stages.length - 1;
}

function setTileMat(row, col) {
  const isSel = selectedCell?.row === row && selectedCell?.col === col;
  const isHov = hoveredCell?.row === row && hoveredCell?.col === col;
  const isOcc = cellState[row][col] !== null;
  const isReady = isReadyToCollect(row, col);
  let mat = MAT_DEFAULT;
  if (isSel) mat = MAT_SELECTED;
  else if (isReady) mat = MAT_READY;
  else if (isHov) mat = MAT_HOVER;
  else if (isOcc) mat = MAT_OCCUPIED;
  tileMeshes[row][col].material = mat.clone();
}

let money = STARTING_MONEY;

function renderMoney() {
  PixiUI.updateMoneyHUD(money);
}

function isAnimal(key) {
  return key != null && key in ANIMAL_DEFS;
}
function isAnimalReady(row, col) {
  const s = cellState[row][col];
  if (!s || !isAnimal(s.key) || s.startTime == null) return false;
  return (Date.now() - s.startTime) / 1000 >= ANIMAL_DEFS[s.key].productionTime;
}
function isReadyToCollect(row, col) {
  return isFullyGrown(row, col) || isAnimalReady(row, col);
}

function iconImg(key, size = 22) {
  const src = ITEM_ICONS[key];
  return src
    ? `<img src="${src}" class="item-icon" style="width:${size}px;height:${size}px">`
    : key;
}

const storage = { corn: 0, tomato: 0, strawberry: 0, egg: 0, milk: 0 };

function renderStorage() {
  PixiUI.updateStoragePanel(storage);
  for (const car of carQueue) {
    if (car.state === "serving") refreshCarLabel(car);
  }
}

function harvestCell(row, col) {
  const state = cellState[row][col];
  if (!state || !isCrop(state.key) || !isFullyGrown(row, col)) return;
  storage[state.key] = (storage[state.key] || 0) + 1;
  playPopup();
  renderStorage();
  state.stage = 0;
  state.startTime = Date.now();
  if (itemMeshes[row][col]) {
    scene.remove(itemMeshes[row][col]);
    itemMeshes[row][col] = null;
  }
  spawnMesh(CROP_DEFS[state.key].stages[0], row, col);
  setTileMat(row, col);
  updateGrowthLabelContent(row, col);
}

function collectAnimal(row, col) {
  const state = cellState[row][col];
  if (!state || !isAnimal(state.key) || !isAnimalReady(row, col)) return;
  const product = ANIMAL_DEFS[state.key].product;
  storage[product] = (storage[product] || 0) + 1;
  if (state.key === "chicken") playChicken();
  else if (state.key === "cow") playCow();
  renderStorage();
  state.startTime = Date.now();
  setTileMat(row, col);
  updateGrowthLabelContent(row, col);
}

const itemLibrary = new Map();

function getCellKey(row, col) {
  return cellState[row][col]?.key ?? null;
}
function isCrop(key) {
  return key != null && key in CROP_DEFS;
}

function computeFitParams(source, def = {}) {
  const userScale = def.scale ?? 1.0;
  const userOffset = def.offset ?? { x: 0, y: 0, z: 0 };

  const tmp = source.clone(true);
  tmp.position.set(0, 0, 0);
  tmp.rotation.set(0, 0, 0);
  tmp.scale.set(1, 1, 1);

  const box = new THREE.Box3().setFromObject(tmp);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scaleFactor = (0.75 / maxDim) * userScale;

  tmp.scale.setScalar(scaleFactor);
  const b2 = new THREE.Box3().setFromObject(tmp);
  const center = new THREE.Vector3();
  b2.getCenter(center);

  return {
    source,
    scaleFactor,
    offsetX: -center.x + userOffset.x,
    offsetY: -b2.min.y + userOffset.y,
    offsetZ: -center.z + userOffset.z,
  };
}

function loadGLB(path) {
  const loader = new GLTFLoader();
  return new Promise((res, rej) => loader.load(path, res, undefined, rej));
}

async function loadItemLibrary() {
  const [itemsGltf, chickenGltf, gardenGltf, carGltf, forestGltf] =
    await Promise.all([
      loadGLB("/assets/glb/items.glb"),
      loadGLB("/assets/glb/chicken.glb"),
      loadGLB("/assets/glb/garden.glb"),
      loadGLB("/assets/glb/car.glb"),
      loadGLB("/assets/glb/forest-decoration.glb"),
    ]);

  const garden = gardenGltf.scene;
  garden.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  garden.scale.setScalar(GARDEN_SCALE);
  garden.position.set(GARDEN_POS.x, GARDEN_POS.y, GARDEN_POS.z);
  scene.add(garden);

  for (const pos of FOREST_POSITIONS) {
    const forest = SkeletonUtils.clone(forestGltf.scene);
    forest.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    forest.scale.setScalar(FOREST_SCALE);
    forest.position.set(pos.x, pos.y, pos.z);
    scene.add(forest);
  }

  const root = itemsGltf.scene;

  for (const def of ITEM_DEFS) {
    if (def.key === "chicken" || isCrop(def.key)) continue;
    const node = root.getObjectByName(def.node);
    if (!node) {
      console.warn(`items.glb: "${def.node}" not found`);
      continue;
    }
    itemLibrary.set(def.key, computeFitParams(node, def));
  }

  for (const [cropKey, cropDef] of Object.entries(CROP_DEFS)) {
    const baseDef = ITEM_DEFS.find((d) => d.key === cropKey);
    for (const nodeName of cropDef.stages) {
      const node = root.getObjectByName(nodeName);
      if (!node) {
        console.warn(`items.glb: "${nodeName}" not found`);
        continue;
      }
      itemLibrary.set(nodeName, computeFitParams(node, baseDef));
    }
  }

  const chickenDef = ITEM_DEFS.find((d) => d.key === "chicken");
  itemLibrary.set("chicken", computeFitParams(chickenGltf.scene, chickenDef));

  carSource = carGltf.scene;
  const cBox = new THREE.Box3().setFromObject(carSource);
  const cSize = new THREE.Vector3();
  cBox.getSize(cSize);
  const cScale = (1.8 / Math.max(cSize.x, cSize.z, 0.001)) * CAR_SCALE;
  carSource.scale.setScalar(cScale);
  carSource.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
}

function spawnMesh(nodeKey, row, col) {
  if (!itemLibrary.has(nodeKey)) return;
  const { source, scaleFactor, offsetX, offsetY, offsetZ } =
    itemLibrary.get(nodeKey);
  const obj = SkeletonUtils.clone(source);
  const tile = tileMeshes[row][col];
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  obj.scale.setScalar(scaleFactor);
  obj.position.set(
    tile.position.x + offsetX,
    TILE_HEIGHT + offsetY,
    tile.position.z + offsetZ,
  );
  obj.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  scene.add(obj);
  itemMeshes[row][col] = obj;
}

function createGrowthLabel(row, col) {
  PixiUI.createGrowthLabel(`${row}_${col}`);
}

function removeGrowthLabel(row, col) {
  PixiUI.removeGrowthLabel(`${row}_${col}`);
}

function updateGrowthLabelContent(row, col) {
  const state = cellState[row][col];
  if (!state) return;
  const key = `${row}_${col}`;

  if (isCrop(state.key)) {
    const ready = isFullyGrown(row, col);
    const progress = ready
      ? 1
      : Math.min(
          (Date.now() - state.startTime) /
            1000 /
            CROP_DEFS[state.key].productionTime,
          1,
        );
    PixiUI.updateGrowthLabel(key, ready, progress, true);
  } else if (isAnimal(state.key)) {
    const ready = isAnimalReady(row, col);
    const progress = ready
      ? 1
      : Math.min(
          (Date.now() - state.startTime) /
            1000 /
            ANIMAL_DEFS[state.key].productionTime,
          1,
        );
    PixiUI.updateGrowthLabel(key, ready, progress, false);
  }
}

const _labelPos = new THREE.Vector3();
function updateAllLabelPositions() {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const key = `${row}_${col}`;
      if (!PixiUI.hasGrowthLabel(key)) continue;
      const tile = tileMeshes[row][col];
      _labelPos.set(tile.position.x, 0.9, tile.position.z);
      _labelPos.project(camera);
      const x = (_labelPos.x * 0.5 + 0.5) * innerWidth;
      const y = (_labelPos.y * -0.5 + 0.5) * innerHeight;
      PixiUI.positionGrowthLabel(key, x, y);
    }
  }
}

function placeItem(row, col, name) {
  const def = ITEM_DEFS.find((d) => d.key === name);
  const price = def?.price ?? 0;
  const prevKey = getCellKey(row, col);
  const prevDef = ITEM_DEFS.find((d) => d.key === prevKey);

  const refund = prevDef?.price ?? 0;
  const cost = name ? Math.max(0, price - refund) : 0;
  if (name && money < cost) return;

  if (itemMeshes[row][col]) {
    scene.remove(itemMeshes[row][col]);
    itemMeshes[row][col] = null;
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
}

function tickGrowth() {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const state = cellState[row][col];
      if (!state || !isCrop(state.key)) continue;
      const cropDef = CROP_DEFS[state.key];
      const maxStage = cropDef.stages.length - 1;
      if (state.stage >= maxStage) continue;
      const stageTime = cropDef.productionTime / maxStage;
      const elapsed = (Date.now() - state.startTime) / 1000;
      const newStage = Math.min(Math.floor(elapsed / stageTime), maxStage);
      if (newStage > state.stage) {
        state.stage = newStage;
        if (itemMeshes[row][col]) {
          scene.remove(itemMeshes[row][col]);
          itemMeshes[row][col] = null;
        }
        spawnMesh(cropDef.stages[newStage], row, col);
        if (newStage === maxStage) setTileMat(row, col);
      }
      updateGrowthLabelContent(row, col);
    }
  }
}

function tickAnimals() {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const state = cellState[row][col];
      if (!state || !isAnimal(state.key)) continue;
      const wasReady = isAnimalReady(row, col);
      updateGrowthLabelContent(row, col);
      if (wasReady) setTileMat(row, col);
    }
  }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const allTiles = tileMeshes.flat();

function hitTile(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allTiles);
  return hits.length ? hits[0].object.userData : null;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    const p = camera.position;
    const r = camera.rotation;
    console.log("📷 Camera details:");
    console.log(`  position : x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}, z=${p.z.toFixed(3)}`);
    console.log(`  rotation : x=${r.x.toFixed(3)}, y=${r.y.toFixed(3)}, z=${r.z.toFixed(3)} (rad)`);
    console.log(`  target   : x=${controls.target.x.toFixed(3)}, y=${controls.target.y.toFixed(3)}, z=${controls.target.z.toFixed(3)}`);
    console.log(`  zoom/dist: ${camera.position.distanceTo(controls.target).toFixed(3)}`);
    console.log(`  fov      : ${camera.fov}`);
  }
});

window.addEventListener("pointermove", (e) => {
  if (PixiUI.isAnyModalOpen()) return;
  const prev = hoveredCell;
  const hit = hitTile(e);
  hoveredCell = hit ? { row: hit.row, col: hit.col } : null;
  if (prev) setTileMat(prev.row, prev.col);
  if (hoveredCell) setTileMat(hoveredCell.row, hoveredCell.col);
});

let _downX = 0, _downY = 0;

window.addEventListener("pointerdown", (e) => {
  _downX = e.clientX;
  _downY = e.clientY;
});

window.addEventListener("pointerup", (e) => {
  if (PixiUI.isAnyModalOpen()) return;
  const dx = e.clientX - _downX;
  const dy = e.clientY - _downY;
  if (Math.sqrt(dx * dx + dy * dy) > 6) return; // drag, not a click

  const hit = hitTile(e);
  const prev = selectedCell;
  if (hit) {
    const collected =
      isFullyGrown(hit.row, hit.col) || isAnimalReady(hit.row, hit.col);
    if (isFullyGrown(hit.row, hit.col)) harvestCell(hit.row, hit.col);
    if (isAnimalReady(hit.row, hit.col)) collectAnimal(hit.row, hit.col);
    if (collected) {
      selectedCell = null;
      hidePanel();
    } else {
      selectedCell = { row: hit.row, col: hit.col };
      showPanel(hit.row, hit.col);
    }
  } else {
    selectedCell = null;
    hidePanel();
  }
  if (prev) setTileMat(prev.row, prev.col);
  if (selectedCell) setTileMat(selectedCell.row, selectedCell.col);
});

function showPanel(row, col) {
  const current = getCellKey(row, col);
  PixiUI.showShopModal(current, money);
}

function hidePanel() {
  PixiUI.hideShopModal();
}

const roadSurface = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH),
  new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
);
roadSurface.rotation.x = -Math.PI / 2;
roadSurface.position.set(0, -0.04, ROAD_Z);
roadSurface.receiveShadow = true;
scene.add(roadSurface);

const dashGeo = new THREE.PlaneGeometry(ROAD_LENGTH, 0.08);
const dashMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
const centerLine = new THREE.Mesh(dashGeo, dashMat);
centerLine.rotation.x = -Math.PI / 2;
centerLine.position.set(0, -0.03, ROAD_Z);
scene.add(centerLine);

for (const dz of [-ROAD_WIDTH / 2, ROAD_WIDTH / 2]) {
  const kerb = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_LENGTH, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
  );
  kerb.rotation.x = -Math.PI / 2;
  kerb.position.set(0, -0.03, ROAD_Z + dz);
  scene.add(kerb);
}

const PRODUCIBLE_ITEMS = Object.keys(SELL_PRICES);

let carSource = null;
let nextCarSpawn = Infinity;
const carQueue = [];
const carLabelsEl = document.getElementById("car-labels");

function queueTargetX(idx) {
  return SERVICE_X - idx * QUEUE_GAP;
}

function generateWishlist() {
  const shuffled = [...PRODUCIBLE_ITEMS].sort(() => Math.random() - 0.5);
  const types =
    CAR_WISH_MIN_TYPES +
    Math.floor(Math.random() * (CAR_WISH_MAX_TYPES - CAR_WISH_MIN_TYPES + 1));
  const w = {};
  for (let i = 0; i < types; i++)
    w[shuffled[i]] =
      CAR_WISH_MIN_QTY +
      Math.floor(Math.random() * (CAR_WISH_MAX_QTY - CAR_WISH_MIN_QTY + 1));
  return w;
}

function rebindCarSellButtons(car) {
  car.labelEl.querySelectorAll(".car-sell-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = btn.dataset.item;
      const qty = Math.min(car.wishlist[item] || 0, storage[item] || 0);
      if (qty <= 0) return;
      playClick();
      storage[item] -= qty;
      car.wishlist[item] -= qty;
      money += qty * SELL_PRICES[item];
      renderMoney();
      renderStorage();
      refreshCarLabel(car);
      if (Object.values(car.wishlist).every((v) => v <= 0)) startCarExit(car);
    });
  });
}

function refreshCarLabel(car) {
  if (!car.labelEl) return;
  const isServing = car.state === "serving";
  car.labelEl.style.display = isServing ? "block" : "none";
  if (!isServing) return;

  const remaining = Object.entries(car.wishlist).filter(([, v]) => v > 0);
  if (!remaining.length) {
    car.labelEl.style.display = "none";
    return;
  }

  const rows = remaining
    .map(([key, qty]) => {
      const icon = iconImg(key, 28);
      const has = storage[key] || 0;
      const sellQty = Math.min(has, qty);
      const price = sellQty * SELL_PRICES[key];
      const btn =
        has > 0
          ? `<button class="car-sell-btn" data-item="${key}">Sell ${sellQty} (+${price}🪙)</button>`
          : `<span class="car-need">${icon} ×${qty}</span>`;
      return `<div class="car-item">${has > 0 ? `<span>${icon} ×${qty}</span>` : ""}${btn}</div>`;
    })
    .join("");

  car.labelEl.innerHTML = rows;
  rebindCarSellButtons(car);
}

function updateCarLabelPos(car) {
  if (!car.labelEl || car.state !== "serving") return;
  const p = car.mesh.position.clone();
  p.y += CAR_LABEL_Y;
  p.project(camera);
  car.labelEl.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
  car.labelEl.style.top = `${(p.y * -0.5 + 0.5) * innerHeight}px`;
}

function startCarExit(car) {
  if (car.state === "exiting") return;
  car.state = "exiting";
  refreshCarLabel(car);
  car.targetX = CAR_EXIT_X;
}

function advanceQueue() {
  for (let i = 0; i < carQueue.length; i++) {
    const car = carQueue[i];
    car.targetX = queueTargetX(i);
    if (car.state === "serving") car.state = "moving";
    refreshCarLabel(car);
  }
}

function spawnCar() {
  if (!carSource || carQueue.length >= MAX_QUEUE) return;

  const mesh = SkeletonUtils.clone(carSource);
  const carColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  mesh.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
      const name = (n.name || "").toLowerCase();
      console.log(name);
      if (
        name.includes("cube_material008_0") &&
        n.material &&
        !Array.isArray(n.material) &&
        n.material.opacity >= 0.9
      ) {
        n.material = n.material.clone();
        n.material.color.setHex(carColor);
      }
    }
  });
  mesh.position.set(CAR_ENTER_X, CAR_Y, ROAD_Z);
  mesh.rotation.y = CAR_ROTATION_Y;
  scene.add(mesh);

  const labelEl = document.createElement("div");
  labelEl.className = "car-label";
  labelEl.style.display = "none";
  carLabelsEl.appendChild(labelEl);

  const car = {
    mesh,
    wishlist: generateWishlist(),
    state: "moving",
    targetX: queueTargetX(carQueue.length),
    labelEl,
  };
  carQueue.push(car);
}

function tickCars(delta, nowSec) {
  if (nowSec >= nextCarSpawn && carQueue.length < MAX_QUEUE) {
    spawnCar();
    nextCarSpawn = nowSec + SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  }

  for (let i = carQueue.length - 1; i >= 0; i--) {
    const car = carQueue[i];

    if (car.state === "moving" || car.state === "exiting") {
      const dx = car.targetX - car.mesh.position.x;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), CAR_SPEED * delta);
      car.mesh.position.x += step;

      if (Math.abs(dx) <= 0.05) {
        car.mesh.position.x = car.targetX;
        if (car.state === "exiting") {
          scene.remove(car.mesh);
          car.labelEl?.remove();
          carQueue.splice(i, 1);
          advanceQueue();
        } else if (i === 0) {
          car.state = "serving";
          refreshCarLabel(car);
        }
      }
    } else if (car.state === "serving") {
      updateCarLabelPos(car);
    }
  }
}

let _lastTs = 0;
function animate(ts = 0) {
  requestAnimationFrame(animate);
  const delta = Math.min((ts - _lastTs) / 1000, 0.1);
  _lastTs = ts;
  const nowSec = ts / 1000;
  controls.update();
  controls.target.x = Math.max(
    CTRL_PAN_MIN.x,
    Math.min(CTRL_PAN_MAX.x, controls.target.x),
  );
  controls.target.z = Math.max(
    CTRL_PAN_MIN.z,
    Math.min(CTRL_PAN_MAX.z, controls.target.z),
  );
  tickGrowth();
  tickAnimals();
  tickCars(delta, nowSec);
  updateAllLabelPositions();
  renderer.render(scene, camera);
}
animate();

const _pixiReady = PixiUI.initPixi().then(async () => {
  await Promise.all([
    PixiUI.createMoneyHUD(),
    PixiUI.createStoragePanel(ITEM_ICONS),
  ]);
  PixiUI.initGrowthLabels();

  const savedTarget = controls.target.clone();
  controls.dispose();
  controls = new OrbitControls(camera, PixiUI.getCanvas());
  applyControlsSettings(controls);
  controls.target.copy(savedTarget);
  controls.update();
});

Promise.all([loadItemLibrary(), _pixiReady])
  .then(() => {
    PixiUI.createButtons(() => PixiUI.showInfoModal(), () => toggleMute(), isMuted());

    PixiUI.buildInfoModal(
      ITEM_DEFS,
      ITEM_ICONS,
      CROP_DEFS,
      ANIMAL_DEFS,
      SELL_PRICES,
    );
    PixiUI.buildShopModal(ITEM_DEFS, CROP_DEFS, ANIMAL_DEFS, {
      onSelect: (key) => {
        if (!selectedCell) return;
        placeItem(selectedCell.row, selectedCell.col, key);
        const prev = selectedCell;
        selectedCell = null;
        if (prev) setTileMat(prev.row, prev.col);
        PixiUI.hideShopModal();
      },
      onClear: () => {
        if (!selectedCell) return;
        placeItem(selectedCell.row, selectedCell.col, null);
        PixiUI.hideShopModal();
        const prev = selectedCell;
        selectedCell = null;
        if (prev) setTileMat(prev.row, prev.col);
      },
      onClose: () => {
        const prev = selectedCell;
        selectedCell = null;
        if (prev) setTileMat(prev.row, prev.col);
      },
    });

    renderMoney();
    renderStorage();
    nextCarSpawn = performance.now() / 1000 + 10;
    const loading = document.getElementById("loading-screen");
    if (loading) {
      loading.classList.add("fade-out");
      setTimeout(() => loading.remove(), 600);
    }
    playBg();

    setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 800);
  })
  .catch((err) => {
    console.error("Boot failed:", err);
  });
