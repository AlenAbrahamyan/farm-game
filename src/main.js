import * as THREE from "three";
import * as PixiUI from "./ui/PixiUI.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  initTutorial, tutorialStep, advanceTutorial,
  showArrow, hideArrow, showHint,
  getPlantedCell,
  STEPS as TUT_STEPS,
} from "./tutorial.js";
import { playBg, toggleMute, isMuted } from "./sounds.js";
import { renderer, scene, camera } from "./renderer.js";
import {
  tileMeshes,
  setTileMat, setTutorialLock, clearTutorialLock,
  isFullyGrown, isAnimalReady,
  getCellKey,
} from "./grid.js";
import { loadAssets, tickMixers } from "./assets.js";
import {
  initFarm, money, renderMoney, updateStorageUI,
  harvestCell, collectAnimal, placeItem,
  tickGrowth, tickAnimals, updateAllLabelPositions,
} from "./farm.js";
import {
  initCars, carQueue, setNextCarSpawn, refreshServingCarLabels,
  tickCars,
} from "./cars.js";
import {
  GRID, PITCH, ORIGIN, TILE_HEIGHT,
  CAMERA_POS, SERVICE_X, ROAD_Z,
  CTRL_DAMPING, CTRL_MIN_DIST, CTRL_MAX_DIST, CTRL_MIN_POLAR, CTRL_MAX_POLAR,
  CTRL_ENABLE_PAN, CTRL_ENABLE_ROTATE, CTRL_ENABLE_ZOOM, CTRL_PAN_MIN, CTRL_PAN_MAX,
  ITEM_DEFS, ITEM_ICONS, CROP_DEFS, ANIMAL_DEFS, SELL_PRICES,
} from "./config.js";

function applyControlsSettings(c) {
  c.enableDamping  = true;
  c.dampingFactor  = CTRL_DAMPING;
  c.minDistance    = CTRL_MIN_DIST;
  c.maxDistance    = CTRL_MAX_DIST;
  c.minPolarAngle  = CTRL_MIN_POLAR;
  c.maxPolarAngle  = CTRL_MAX_POLAR;
  c.enablePan      = CTRL_ENABLE_PAN;
  c.enableRotate   = CTRL_ENABLE_ROTATE;
  c.enableZoom     = CTRL_ENABLE_ZOOM;
}

let controls = new OrbitControls(camera, renderer.domElement);
applyControlsSettings(controls);
controls.target.set(0, 0, 0);

let _camAnim = null;

function _panCamera(toPos, toTarget, duration = 2.0, onDone = null) {
  controls.enabled = false;
  _camAnim = {
    fromPos:    camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos,
    toTarget,
    t: 0,
    duration,
    onDone,
  };
}

function _panCameraToRoad() {
  _panCamera(
    new THREE.Vector3(SERVICE_X, 14, 22),
    new THREE.Vector3(SERVICE_X, 0, ROAD_Z),
    2.5,
  );
}

function _tickCameraAnim(delta) {
  if (!_camAnim) return;
  _camAnim.t += delta / _camAnim.duration;
  const t = Math.min(_camAnim.t, 1);
  const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  camera.position.lerpVectors(_camAnim.fromPos, _camAnim.toPos, e);
  controls.target.lerpVectors(_camAnim.fromTarget, _camAnim.toTarget, e);
  if (t >= 1) {
    const cb = _camAnim.onDone;
    _camAnim = null;
    if (cb) cb();
    else if (tutorialStep() !== "done") controls.enabled = false;
    else controls.enabled = true;
  }
}

function advance(toStep) {
  advanceTutorial(toStep);

  const planted = getPlantedCell();
  if (toStep === "harvest" && planted) {
    setTutorialLock(planted.row, planted.col);
    const wx = ORIGIN + planted.col * PITCH;
    const wz = ORIGIN + planted.row * PITCH;
    _panCamera(
      new THREE.Vector3(wx - 2, 10, wz + 10),
      new THREE.Vector3(wx, 0, wz),
      2.0,
    );
  } else if (toStep === "done") {
    clearTutorialLock();
    _panCamera(
      new THREE.Vector3(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z),
      new THREE.Vector3(0, 0, 0),
      2.0,
      () => { controls.enabled = true; controls.enableRotate = true; },
    );
  }
}

const _wpVec = new THREE.Vector3();

function _cellScreenPos(row, col) {
  _wpVec.set(ORIGIN + col * PITCH, TILE_HEIGHT, ORIGIN + row * PITCH);
  _wpVec.project(camera);
  return {
    x: (_wpVec.x *  0.5 + 0.5) * innerWidth,
    y: (_wpVec.y * -0.5 + 0.5) * innerHeight,
  };
}

function _updateTutorialArrow() {
  const step = tutorialStep();
  if (step === "cell") {
    const mid = Math.floor(GRID / 2);
    const pos = _cellScreenPos(mid, mid);
    showArrow(pos.x, pos.y, "Tap a plot!");
  } else if (step === "corn") {
    const pos = PixiUI.getShopCardScreenPos("corn");
    if (pos) showArrow(pos.x, pos.y, "Plant Corn!");
    else hideArrow();
  } else if (step === "grow") {
    hideArrow();
    showHint("⏳ Corn growing — check back soon!");
  } else if (step === "harvest") {
    const planted = getPlantedCell();
    if (planted) {
      const pos = _cellScreenPos(planted.row, planted.col);
      showArrow(pos.x, pos.y, "Harvest your Corn!");
    }
  } else if (step === "car_wait") {
    hideArrow();
    showHint("🚗 A customer is on the way...");
  } else if (step === "sell") {
    const servingCar = carQueue.find((c) => c.state === "serving");
    if (servingCar?.labelEl) {
      const btn = servingCar.labelEl.querySelector(".car-sell-btn");
      if (btn) {
        const rect = btn.getBoundingClientRect();
        showArrow(rect.left + rect.width / 2, rect.top, "Sell Corn!");
      }
    }
  }
}

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();
const allTiles  = tileMeshes.flat();

function hitTile(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width)  *  2 - 1;
  mouse.y = -((event.clientY - rect.top)  / rect.height) *  2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allTiles);
  return hits.length ? hits[0].object.userData : null;
}

let _selectedCell = null;
let _tutTargetCell = null;
let _downX = 0, _downY = 0;

function showPanel(row, col) {
  const current = getCellKey(row, col);
  PixiUI.showShopModal(current, money);
  if (tutorialStep() === "cell") {
    clearTutorialLock();
    advance("corn");
  }
  if (tutorialStep() === "corn") {
    PixiUI.setShopLock("corn");
    PixiUI.setShopCloseLocked(true);
  }
}

function hidePanel() {
  PixiUI.hideShopModal();
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    const p = camera.position;
    const r = camera.rotation;
    console.log("📷 Camera:");
    console.log(`  pos    : x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}, z=${p.z.toFixed(3)}`);
    console.log(`  rot    : x=${r.x.toFixed(3)}, y=${r.y.toFixed(3)}, z=${r.z.toFixed(3)}`);
    console.log(`  target : x=${controls.target.x.toFixed(3)}, y=${controls.target.y.toFixed(3)}, z=${controls.target.z.toFixed(3)}`);
    console.log(`  dist   : ${camera.position.distanceTo(controls.target).toFixed(3)}`);
  }
});

window.addEventListener("pointermove", (e) => {
  if (PixiUI.isAnyModalOpen()) return;
  const hit  = hitTile(e);
  const prev = { row: _hoveredCell?.row, col: _hoveredCell?.col };
  _hoveredCell = hit ? { row: hit.row, col: hit.col } : null;
  if (prev.row != null) setTileMat(prev.row, prev.col);
  if (_hoveredCell)     setTileMat(_hoveredCell.row, _hoveredCell.col);
});

let _hoveredCell = null;

window.addEventListener("pointerdown", (e) => { _downX = e.clientX; _downY = e.clientY; });

window.addEventListener("pointerup", (e) => {
  if (PixiUI.isAnyModalOpen()) return;
  const dx = e.clientX - _downX;
  const dy = e.clientY - _downY;
  if (Math.sqrt(dx * dx + dy * dy) > 6) return;

  const tStep = tutorialStep();
  if (tStep !== "done" && tStep !== "cell" && tStep !== "harvest") return;

  const hit = hitTile(e);

  if (tStep === "cell" && hit && _tutTargetCell) {
    if (hit.row !== _tutTargetCell.row || hit.col !== _tutTargetCell.col) return;
  }
  if (tStep === "harvest" && hit) {
    const planted = getPlantedCell();
    if (planted && (hit.row !== planted.row || hit.col !== planted.col)) return;
  }

  const prev = _selectedCell;
  if (hit) {
    const collected = isFullyGrown(hit.row, hit.col) || isAnimalReady(hit.row, hit.col);
    if (isFullyGrown(hit.row, hit.col))  harvestCell(hit.row, hit.col);
    if (isAnimalReady(hit.row, hit.col)) collectAnimal(hit.row, hit.col);
    if (collected) {
      _selectedCell = null;
      hidePanel();
    } else {
      _selectedCell = { row: hit.row, col: hit.col };
      showPanel(hit.row, hit.col);
    }
  } else {
    _selectedCell = null;
    hidePanel();
  }

  if (prev) setTileMat(prev.row, prev.col);
  if (_selectedCell) setTileMat(_selectedCell.row, _selectedCell.col);
});

let _lastTs = 0;

function animate(ts = 0) {
  requestAnimationFrame(animate);
  const delta  = Math.min((ts - _lastTs) / 1000, 0.1);
  _lastTs = ts;
  const nowSec = ts / 1000;

  _tickCameraAnim(delta);

  controls.update();
  controls.target.x = Math.max(CTRL_PAN_MIN.x, Math.min(CTRL_PAN_MAX.x, controls.target.x));
  controls.target.z = Math.max(CTRL_PAN_MIN.z, Math.min(CTRL_PAN_MAX.z, controls.target.z));

  tickMixers(delta);
  tickGrowth();
  tickAnimals();

  const tutIdx     = TUT_STEPS.indexOf(tutorialStep());
  const carWaitIdx = TUT_STEPS.indexOf("car_wait");
  tickCars(delta, nowSec, tutIdx, carWaitIdx, camera, () => {
    if (tutorialStep() === "car_wait") _panCameraToRoad();
  });

  updateAllLabelPositions(camera);
  if (tutorialStep() !== "done") _updateTutorialArrow();

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

Promise.all([loadAssets(), _pixiReady])
  .then(() => {
    initFarm(advance, refreshServingCarLabels);
    initCars(advance);

    PixiUI.createButtons(
      () => PixiUI.showInfoModal(),
      () => PixiUI.showSettingsModal(),
    );
    PixiUI.buildSettingsModal(
      () => location.reload(),
      () => toggleMute(),
      isMuted(),
    );
    PixiUI.buildInfoModal(ITEM_DEFS, ITEM_ICONS, CROP_DEFS, ANIMAL_DEFS, SELL_PRICES);
    PixiUI.buildShopModal(ITEM_DEFS, CROP_DEFS, ANIMAL_DEFS, {
      onSelect: (key) => {
        if (!_selectedCell) return;
        placeItem(_selectedCell.row, _selectedCell.col, key);
        const prev = _selectedCell;
        _selectedCell = null;
        if (prev) setTileMat(prev.row, prev.col);
        PixiUI.hideShopModal();
      },
      onClear: () => {
        if (!_selectedCell) return;
        placeItem(_selectedCell.row, _selectedCell.col, null);
        PixiUI.hideShopModal();
        const prev = _selectedCell;
        _selectedCell = null;
        if (prev) setTileMat(prev.row, prev.col);
      },
      onClose: () => {
        const prev = _selectedCell;
        _selectedCell = null;
        if (prev) setTileMat(prev.row, prev.col);
      },
    });

    initTutorial();
    if (tutorialStep() !== "done") {
      controls.enableRotate = false;
      controls.enabled = false;
      const mid = Math.floor(GRID / 2);
      _tutTargetCell = { row: mid, col: mid };
      setTutorialLock(mid, mid);
    }

    renderMoney();
    updateStorageUI();
    setNextCarSpawn(performance.now() / 1000 + 10);

    const loading = document.getElementById("loading-screen");
    if (loading) {
      loading.classList.add("fade-out");
      setTimeout(() => loading.remove(), 600);
    }
    playBg();
  })
  .catch((err) => console.error("Boot failed:", err));
