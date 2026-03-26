import * as THREE from "three";
import { scene } from "./renderer.js";
import {
  GRID, CELL, PITCH, ORIGIN, TILE_HEIGHT,
  TILE_COLOR_DEFAULT, TILE_COLOR_HOVER, TILE_COLOR_SELECTED,
  TILE_COLOR_OCCUPIED, TILE_COLOR_READY,
  CROP_DEFS, ANIMAL_DEFS,
} from "./config.js";

const tileGeo = new THREE.BoxGeometry(CELL, TILE_HEIGHT, CELL);
export const MAT_DEFAULT  = new THREE.MeshLambertMaterial({ color: TILE_COLOR_DEFAULT });
export const MAT_HOVER    = new THREE.MeshLambertMaterial({ color: TILE_COLOR_HOVER });
export const MAT_SELECTED = new THREE.MeshLambertMaterial({ color: TILE_COLOR_SELECTED });
export const MAT_OCCUPIED = new THREE.MeshLambertMaterial({ color: TILE_COLOR_OCCUPIED });
export const MAT_READY    = new THREE.MeshLambertMaterial({ color: TILE_COLOR_READY });
export const MAT_LOCKED   = new THREE.MeshLambertMaterial({ color: 0x3a2a18, transparent: true, opacity: 0.55 });

export const cellState  = Array.from({ length: GRID }, () => Array(GRID).fill(null));
export const tileMeshes = [];
export const itemMeshes = [];

let _selectedCell = null;
let _hoveredCell  = null;

export function getSelectedCell()  { return _selectedCell; }
export function getHoveredCell()   { return _hoveredCell; }
export function setSelectedCell(c) { _selectedCell = c; }
export function setHoveredCell(c)  { _hoveredCell  = c; }

const _lockedCells = new Set();

export function setTutorialLock(activeRow, activeCol) {
  _lockedCells.clear();
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (r !== activeRow || c !== activeCol) _lockedCells.add(`${r},${c}`);
  _refreshAllMats();
}

export function clearTutorialLock() {
  _lockedCells.clear();
  _refreshAllMats();
}

function _refreshAllMats() {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) setTileMat(r, c);
}

for (let row = 0; row < GRID; row++) {
  tileMeshes.push([]);
  itemMeshes.push([]);
  for (let col = 0; col < GRID; col++) {
    const mesh = new THREE.Mesh(tileGeo, MAT_DEFAULT);
    mesh.position.set(ORIGIN + col * PITCH, 0, ORIGIN + row * PITCH);
    mesh.receiveShadow = true;
    mesh.userData = { row, col };
    scene.add(mesh);
    tileMeshes[row].push(mesh);
    itemMeshes[row].push(null);
  }
}

export function isCrop(key)   { return key != null && key in CROP_DEFS; }
export function isAnimal(key) { return key != null && key in ANIMAL_DEFS; }
export function getCellKey(row, col) { return cellState[row][col]?.key ?? null; }

export function isFullyGrown(row, col) {
  const s = cellState[row][col];
  return s && isCrop(s.key) && s.stage >= CROP_DEFS[s.key].stages.length - 1;
}

export function isAnimalReady(row, col) {
  const s = cellState[row][col];
  if (!s || !isAnimal(s.key) || s.startTime == null) return false;
  return (Date.now() - s.startTime) / 1000 >= ANIMAL_DEFS[s.key].productionTime;
}

export function isReadyToCollect(row, col) {
  return isFullyGrown(row, col) || isAnimalReady(row, col);
}

export function setTileMat(row, col) {
  const isSel    = _selectedCell?.row === row && _selectedCell?.col === col;
  const isHov    = _hoveredCell?.row  === row && _hoveredCell?.col  === col;
  const isOcc    = cellState[row][col] !== null;
  const isReady  = isReadyToCollect(row, col);
  const isLocked = _lockedCells.has(`${row},${col}`);

  let mat = MAT_DEFAULT;
  if (isLocked)     mat = MAT_LOCKED;
  else if (isSel)   mat = MAT_SELECTED;
  else if (isReady) mat = MAT_READY;
  else if (isHov)   mat = MAT_HOVER;
  else if (isOcc)   mat = MAT_OCCUPIED;

  tileMeshes[row][col].material = mat;
}
