import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { scene } from "./renderer.js";
import { tileMeshes, itemMeshes } from "./grid.js";
import {
  TILE_HEIGHT, ITEM_DEFS, CROP_DEFS,
  GARDEN_SCALE, GARDEN_POS, FOREST_SCALE, FOREST_POSITIONS, CAR_SCALE,
} from "./config.js";

export const itemLibrary = new Map();
export const itemMixers  = new Map();
export let   carSource   = null;

function loadGLB(path) {
  const loader = new GLTFLoader();
  return new Promise((res, rej) => loader.load(path, res, undefined, rej));
}

function computeFitParams(source, def = {}, animations = []) {
  const userScale  = def.scale  ?? 1.0;
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
    animations,
  };
}

export async function loadAssets() {
  const [itemsGltf, chickenGltf, gardenGltf, carGltf, forestGltf] = await Promise.all([
    loadGLB("/assets/glb/items.glb"),
    loadGLB("/assets/glb/chicken.glb"),
    loadGLB("/assets/glb/garden.glb"),
    loadGLB("/assets/glb/car.glb"),
    loadGLB("/assets/glb/forest-decoration.glb"),
  ]);

  const garden = gardenGltf.scene;
  garden.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  garden.scale.setScalar(GARDEN_SCALE);
  garden.position.set(GARDEN_POS.x, GARDEN_POS.y, GARDEN_POS.z);
  scene.add(garden);

  for (const pos of FOREST_POSITIONS) {
    const forest = SkeletonUtils.clone(forestGltf.scene);
    forest.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    forest.scale.setScalar(FOREST_SCALE);
    forest.position.set(pos.x, pos.y, pos.z);
    scene.add(forest);
  }

  const root = itemsGltf.scene;
  for (const def of ITEM_DEFS) {
    if (def.key === "chicken" || def.key in CROP_DEFS) continue;
    const node = root.getObjectByName(def.node);
    if (!node) { console.warn(`items.glb: "${def.node}" not found`); continue; }
    itemLibrary.set(def.key, computeFitParams(node, def, itemsGltf.animations));
  }

  for (const [cropKey, cropDef] of Object.entries(CROP_DEFS)) {
    const baseDef = ITEM_DEFS.find((d) => d.key === cropKey);
    for (const nodeName of cropDef.stages) {
      const node = root.getObjectByName(nodeName);
      if (!node) { console.warn(`items.glb: "${nodeName}" not found`); continue; }
      itemLibrary.set(nodeName, computeFitParams(node, baseDef, itemsGltf.animations));
    }
  }

  const chickenDef = ITEM_DEFS.find((d) => d.key === "chicken");
  itemLibrary.set("chicken", computeFitParams(chickenGltf.scene, chickenDef, chickenGltf.animations));

  const cBox = new THREE.Box3().setFromObject(carGltf.scene);
  const cSize = new THREE.Vector3();
  cBox.getSize(cSize);
  const cScale = (1.8 / Math.max(cSize.x, cSize.z, 0.001)) * CAR_SCALE;
  carGltf.scene.scale.setScalar(cScale);
  carGltf.scene.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  carSource = carGltf.scene;
}

export function removeCellMesh(row, col) {
  if (!itemMeshes[row][col]) return;
  scene.remove(itemMeshes[row][col]);
  itemMeshes[row][col] = null;
  const key = `${row}_${col}`;
  const mixer = itemMixers.get(key);
  if (mixer) { mixer.stopAllAction(); itemMixers.delete(key); }
}

export function spawnMesh(nodeKey, row, col) {
  if (!itemLibrary.has(nodeKey)) return;
  const { source, scaleFactor, offsetX, offsetY, offsetZ, animations } = itemLibrary.get(nodeKey);
  const obj  = SkeletonUtils.clone(source);
  const tile = tileMeshes[row][col];

  obj.scale.setScalar(scaleFactor);
  obj.position.set(
    tile.position.x + offsetX,
    TILE_HEIGHT + offsetY,
    tile.position.z + offsetZ,
  );
  obj.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  scene.add(obj);
  itemMeshes[row][col] = obj;

  if (animations?.length > 0) {
    const nodeNames = new Set();
    obj.traverse((n) => { if (n.name) nodeNames.add(n.name); });
    const clip = animations.find((c) =>
      c.tracks.some((t) => nodeNames.has(t.name.split(/[.[]/)[0]))
    );
    if (clip) {
      const mixer = new THREE.AnimationMixer(obj);
      mixer.clipAction(clip).setLoop(THREE.LoopRepeat).play();
      itemMixers.set(`${row}_${col}`, mixer);
    }
  }
}

export function tickMixers(delta) {
  for (const mixer of itemMixers.values()) mixer.update(delta);
}
