import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MESH_NAMES = {
  chicken: ['Chicken', 'chicken', 'Hen', 'hen', 'Bird', 'bird'],
  cow: ['Cow', 'cow', 'Bull', 'cattle'],
  egg: ['Egg', 'egg'],
  milk: ['Milk', 'milk', 'Bottle', 'MilkBottle'],
  groundCell: ['Ground', 'ground', 'Tile', 'tile', 'Plot', 'Cell', 'GroundCell', 'Dirt', 'dirt', 'Soil'],
  carrot: ['Carrot', 'carrot'],
  corn: ['Corn', 'corn', 'Maize'],
  strawberry: ['Strawberry', 'strawberry', 'Berry'],
  fence: ['Fence', 'fence'],
  barn: ['Barn', 'barn'],
  tree: ['Tree', 'tree'],
};

export class MeshLibrary {
  constructor(itemsGltf, carGltf, gardenGltf) {
    this._templates = new Map();
    this.carTemplate = carGltf.scene;
    this.gardenScene = gardenGltf.scene;

    const discovered = [];
    itemsGltf.scene.traverse(node => {
      if (node.name && node.name !== '') {
        this._templates.set(node.name, node);
        this._templates.set(node.name.toLowerCase(), node);
        discovered.push(node.name + ' [' + node.type + ']');
      }
    });

    console.log('📦 items.glb mesh names discovered:');
    console.log(discovered.join('\n'));
    console.log('Total nodes:', discovered.length);

    const carNodes = [];
    carGltf.scene.traverse(n => { if (n.name) carNodes.push(n.name + ' [' + n.type + ']'); });
    console.log('\n🚗 car.glb nodes:', carNodes.join(', '));

    const gardenNodes = [];
    gardenGltf.scene.traverse(n => { if (n.name) gardenNodes.push(n.name + ' [' + n.type + ']'); });
    console.log('\n🌿 garden.glb nodes:', gardenNodes.join(', '));
  }

  _find(names) {
    for (const name of names) {
      if (this._templates.has(name)) return this._templates.get(name);
    }
    return null;
  }

  clone(key) {
    const names = MESH_NAMES[key];
    if (!names) {
      console.warn(`Unknown mesh key: "${key}"`);
      return this._makeFallback(key);
    }
    const template = this._find(names);
    if (!template) {
      console.warn(`Mesh "${key}" not found in items.glb (tried: ${names.join(', ')})`);
      return this._makeFallback(key);
    }
    const cloned = template.clone(true);
    cloned.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
        }
      }
    });
    return cloned;
  }

  _makeFallback(key) {
    const colors = {
      chicken: 0xffffff,
      cow: 0x111111,
      egg: 0xfffde7,
      milk: 0xe3f2fd,
      groundCell: 0x8d6e63,
      carrot: 0xff7043,
      corn: 0xfdd835,
      strawberry: 0xe53935,
    };
    const color = colors[key] || 0xaaaaaa;
    const geo = key === 'groundCell'
      ? new THREE.BoxGeometry(1.8, 0.15, 1.8)
      : new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = key + '_fallback';
    return mesh;
  }

  getBoundingBox(key) {
    const node = this.clone(key);
    const box = new THREE.Box3().setFromObject(node);
    return box;
  }
}

export async function loadAllAssets(onProgress) {
  const loader = new GLTFLoader();

  const load = (url, label) => new Promise((resolve, reject) => {
    loader.load(
      url,
      gltf => { onProgress && onProgress(label); resolve(gltf); },
      undefined,
      err => { console.error(`Failed to load ${url}:`, err); reject(err); }
    );
  });

  const [itemsGltf, carGltf, gardenGltf] = await Promise.all([
    load('/assets/glb/items.glb', 'items'),
    load('/assets/glb/car.glb', 'car'),
    load('/assets/glb/garden.glb', 'garden'),
  ]);

  return new MeshLibrary(itemsGltf, carGltf, gardenGltf);
}
