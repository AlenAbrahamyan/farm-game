import * as THREE from 'three';
import { state, PRODUCE_INTERVALS, PRODUCE_TYPE, PRODUCE_ICONS, saveGame } from '../state.js';

const PEN_OFFSET_X = -7;
const PEN_OFFSET_Z = -3;
const PEN_COLS = 3;
const PEN_SPACING = 2.5;

export class AnimalPen {
  constructor(scene, meshLibrary, interactiveObjects) {
    this._scene = scene;
    this._lib = meshLibrary;
    this._interactive = interactiveObjects;
    this._group = new THREE.Group();
    this._group.name = 'AnimalPen';
    scene.add(this._group);
    this._time = 0;

    this._buildPenFence();
  }

  _buildPenFence() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const posts = [
      [-1, 0, -1], [7, 0, -1], [-1, 0, 5], [7, 0, 5],
    ];
    posts.forEach(([x, y, z]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), mat);
      post.position.set(PEN_OFFSET_X + x, 0.4, PEN_OFFSET_Z + z);
      post.castShadow = true;
      this._scene.add(post);
    });
    const rails = [
      { pos: [PEN_OFFSET_X + 3, 0.5, PEN_OFFSET_Z - 1], rot: [0, 0, 0], size: [8, 0.08, 0.08] },
      { pos: [PEN_OFFSET_X + 3, 0.3, PEN_OFFSET_Z - 1], rot: [0, 0, 0], size: [8, 0.08, 0.08] },
      { pos: [PEN_OFFSET_X + 3, 0.5, PEN_OFFSET_Z + 5], rot: [0, 0, 0], size: [8, 0.08, 0.08] },
      { pos: [PEN_OFFSET_X - 1, 0.5, PEN_OFFSET_Z + 2], rot: [0, Math.PI/2, 0], size: [6, 0.08, 0.08] },
      { pos: [PEN_OFFSET_X + 7, 0.5, PEN_OFFSET_Z + 2], rot: [0, Math.PI/2, 0], size: [6, 0.08, 0.08] },
    ];
    rails.forEach(r => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...r.size), mat);
      mesh.position.set(...r.pos);
      mesh.rotation.set(...r.rot);
      this._scene.add(mesh);
    });

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 7),
      new THREE.MeshLambertMaterial({ color: 0xc8a96e })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(PEN_OFFSET_X + 3, 0.01, PEN_OFFSET_Z + 2);
    ground.receiveShadow = true;
    this._scene.add(ground);
  }

  restoreAnimals(savedAnimals) {
    for (const saved of savedAnimals) {
      const animalState = {
        ...saved,
        mesh3d: null,
        glowMesh: null,
      };
      state.animals.push(animalState);
      this._placeAnimalMesh(animalState);
    }
  }

  addAnimal(type) {
    const slot = state.animals.length;
    const animalState = {
      id: `animal_${Date.now()}`,
      type,
      produceType: PRODUCE_TYPE[type],
      lastProducedAt: Date.now(),
      produceInterval: PRODUCE_INTERVALS[type],
      hasProduct: false,
      slot,
      mesh3d: null,
      glowMesh: null,
    };
    state.animals.push(animalState);
    state.totalAnimals++;
    this._placeAnimalMesh(animalState);
    saveGame();
    return animalState;
  }

  _placeAnimalMesh(animalState) {
    const slot = animalState.slot || state.animals.indexOf(animalState);
    const col = slot % PEN_COLS;
    const row = Math.floor(slot / PEN_COLS);

    const x = PEN_OFFSET_X + col * PEN_SPACING + 0.5;
    const z = PEN_OFFSET_Z + row * PEN_SPACING + 0.5;

    const animalMesh = this._lib.clone(animalState.type);
    this._normalizeScale(animalMesh, animalState.type === 'cow' ? 1.2 : 0.7);
    animalMesh.position.set(x, 0, z);
    animalMesh.castShadow = true;

    animalMesh.traverse(child => {
      child.userData.type = 'animal';
      child.userData.ref = animalState;
    });

    this._scene.add(animalMesh);
    animalState.mesh3d = animalMesh;
    this._interactive.push(animalMesh);

    const glowGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(x, 1.5, z);
    this._scene.add(glowMesh);
    animalState.glowMesh = glowMesh;

    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PRODUCE_ICONS[animalState.produceType], 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0 }));
    sprite.position.set(x, 2.0, z);
    sprite.scale.set(0.6, 0.6, 1);
    this._scene.add(sprite);
    animalState.sprite = sprite;
  }

  _normalizeScale(obj, targetSize) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    const scale = targetSize / maxDim;
    obj.scale.setScalar(scale);
  }

  handleClick(animalState) {
    if (animalState.hasProduct) {
      this._collect(animalState);
    } else {
      const remaining = Math.ceil(
        (animalState.lastProducedAt + animalState.produceInterval - Date.now()) / 1000
      );
      window._hud?.toast(`Not ready yet! ${remaining}s remaining`, 'warn');
    }
  }

  _collect(animalState) {
    const produce = animalState.produceType;
    state.inventory[produce] = (state.inventory[produce] || 0) + 1;
    animalState.hasProduct = false;
    animalState.lastProducedAt = Date.now();

    if (animalState.glowMesh) animalState.glowMesh.material.opacity = 0;
    if (animalState.sprite) animalState.sprite.material.opacity = 0;

    this._flyUpAnimation(animalState);

    window._hud?.toast(`Collected ${PRODUCE_ICONS[produce]}!`);
    window._hud?.refresh();
    window._inventory?.refresh();
    saveGame();
  }

  _flyUpAnimation(animalState) {
    if (!animalState.mesh3d) return;
    const icon = PRODUCE_ICONS[animalState.produceType];
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const fly = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    fly.position.copy(animalState.mesh3d.position);
    fly.position.y += 1.0;
    fly.scale.set(0.8, 0.8, 1);
    this._scene.add(fly);

    let t = 0;
    const anim = () => {
      t += 0.016;
      fly.position.y += 0.04;
      fly.material.opacity = Math.max(0, 1 - t * 1.5);
      if (t < 0.8) requestAnimationFrame(anim);
      else this._scene.remove(fly);
    };
    anim();
  }

  update(delta) {
    this._time += delta;
    const now = Date.now();

    for (const animal of state.animals) {
      if (!animal.hasProduct) {
        if (now - animal.lastProducedAt >= animal.produceInterval) {
          animal.hasProduct = true;
          window._hud?.toast(`${PRODUCE_ICONS[animal.produceType]} ${animal.type} is ready!`);
        }
      }

      if (animal.glowMesh) {
        animal.glowMesh.material.opacity = animal.hasProduct
          ? 0.7 + Math.sin(this._time * 4) * 0.3
          : 0;
        animal.glowMesh.position.y = 1.5 + Math.sin(this._time * 3) * 0.1;
      }

      if (animal.sprite) {
        animal.sprite.material.opacity = animal.hasProduct ? 1 : 0;
        animal.sprite.position.y = 2.0 + Math.sin(this._time * 2) * 0.05;
      }

      if (animal.mesh3d) {
        const baseY = 0;
        const slot = animal.slot || state.animals.indexOf(animal);
        animal.mesh3d.position.y = baseY + Math.sin(this._time * 1.5 + slot) * 0.04;
        animal.mesh3d.rotation.y = Math.sin(this._time * 0.5 + slot * 0.7) * 0.1;
      }
    }
  }
}
