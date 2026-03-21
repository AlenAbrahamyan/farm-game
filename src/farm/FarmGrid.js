import * as THREE from 'three';
import { state, GROW_TIMES, CROP_ICONS, saveGame } from '../state.js';

const CELL_SIZE = 2.2;

export const CROP_COLORS = {
  carrot: { seed: 0xd4a843, grow: 0x66bb6a, ready: 0xff7043 },
  corn:   { seed: 0xd4a843, grow: 0x81c784, ready: 0xfdd835 },
  strawberry: { seed: 0xd4a843, grow: 0x4caf50, ready: 0xe53935 },
};

export class FarmGrid {
  constructor(scene, meshLibrary, interactiveObjects) {
    this._scene = scene;
    this._lib = meshLibrary;
    this._interactive = interactiveObjects;
    this._cellGroup = new THREE.Group();
    this._cellGroup.name = 'FarmGrid';
    scene.add(this._cellGroup);

    this._pendingPlotId = null;
    this._time = 0;
  }

  build() {
    while (this._cellGroup.children.length > 0) {
      this._cellGroup.remove(this._cellGroup.children[0]);
    }
    this._interactive.length = 0;

    const size = state.gridSize;
    const offset = ((size - 1) * CELL_SIZE) / 2;

    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const id = `${x}_${z}`;
        let plotState = state.plots.find(p => p.id === id);
        if (!plotState) {
          plotState = {
            id,
            gridX: x,
            gridZ: z,
            status: 'empty',
            crop: null,
            plantedAt: null,
            growTime: null,
          };
          state.plots.push(plotState);
        }

        const cellMesh = this._makeCellMesh(x, z, offset, plotState);
        this._cellGroup.add(cellMesh);
        plotState.mesh3d = cellMesh;

        cellMesh.traverse(child => {
          child.userData.type = 'plot';
          child.userData.ref = plotState;
        });
        this._interactive.push(cellMesh);
      }
    }
  }

  _makeCellMesh(x, z, offset, plotState) {
    const group = new THREE.Group();
    group.position.set(
      x * CELL_SIZE - offset,
      0,
      z * CELL_SIZE - offset
    );

    const groundMesh = this._lib.clone('groundCell');
    this._normalizeScale(groundMesh, 1.8);
    groundMesh.receiveShadow = true;
    group.add(groundMesh);

    if (plotState.status !== 'empty') {
      const cropMesh = this._makeCropMesh(plotState);
      if (cropMesh) {
        cropMesh.name = 'crop';
        group.add(cropMesh);
      }
    }

    return group;
  }

  _normalizeScale(obj, targetSize) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.z, 0.01);
    const scale = targetSize / maxDim;
    obj.scale.setScalar(scale);
  }

  _makeCropMesh(plotState) {
    const geo = this._getCropGeo(plotState.status);
    const color = CROP_COLORS[plotState.crop]?.[plotState.status] || 0x66bb6a;
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.y = 0.2;
    return mesh;
  }

  _getCropGeo(status) {
    if (status === 'seed' || status === 'planted') {
      return new THREE.SphereGeometry(0.12, 6, 6);
    } else if (status === 'growing') {
      return new THREE.CylinderGeometry(0.1, 0.15, 0.5, 6);
    } else {
      return new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8);
    }
  }

  handleClick(plotState, onRequestSeed) {
    if (plotState.status === 'empty') {
      this._pendingPlotId = plotState.id;
      onRequestSeed(plotState);
    } else if (plotState.status === 'planted' || plotState.status === 'growing') {
      const remaining = Math.ceil((plotState.plantedAt + plotState.growTime - Date.now()) / 1000);
      window._hud?.toast(`Still growing... ${remaining}s left`, 'warn');
    } else if (plotState.status === 'ready') {
      this._harvest(plotState);
    }
  }

  plant(plotState, cropType, cost) {
    if (state.coins < cost) {
      window._hud?.toast('Not enough coins!', 'error');
      return false;
    }
    state.coins -= cost;
    plotState.status = 'planted';
    plotState.crop = cropType;
    plotState.plantedAt = Date.now();
    plotState.growTime = GROW_TIMES[cropType];
    this._updateCropMesh(plotState);
    window._hud?.refresh();
    saveGame();
    return true;
  }

  _harvest(plotState) {
    const crop = plotState.crop;
    state.inventory[crop] = (state.inventory[crop] || 0) + 1;
    plotState.status = 'empty';
    plotState.crop = null;
    plotState.plantedAt = null;
    plotState.growTime = null;
    this._updateCropMesh(plotState);
    window._hud?.toast(`Harvested ${CROP_ICONS[crop]} ${crop}!`);
    window._hud?.refresh();
    window._inventory?.refresh();
    saveGame();
  }

  _updateCropMesh(plotState) {
    const group = plotState.mesh3d;
    if (!group) return;
    const old = group.getObjectByName('crop');
    if (old) group.remove(old);

    if (plotState.status !== 'empty') {
      const cropMesh = this._makeCropMesh(plotState);
      if (cropMesh) {
        cropMesh.name = 'crop';
        group.add(cropMesh);
        cropMesh.traverse(child => {
          child.userData.type = 'plot';
          child.userData.ref = plotState;
        });
      }
    }

    group.traverse(child => {
      if (child.isMesh && child.material) {
        if (plotState.status === 'ready') {
          child.material.emissive = new THREE.Color(0x226600);
          child.material.emissiveIntensity = 0.3;
        } else {
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }

  update(delta) {
    this._time += delta;
    const now = Date.now();

    for (const plot of state.plots) {
      if (plot.status === 'planted' || plot.status === 'growing') {
        const elapsed = now - plot.plantedAt;
        const progress = elapsed / plot.growTime;

        if (progress >= 1.0 && plot.status !== 'ready') {
          plot.status = 'ready';
          this._updateCropMesh(plot);
          window._hud?.toast(`${CROP_ICONS[plot.crop]} ${plot.crop} is ready!`);
        } else if (progress >= 0.4 && plot.status === 'planted') {
          plot.status = 'growing';
          this._updateCropMesh(plot);
        }

        if (plot.status === 'growing' || plot.status === 'planted') {
          const cropMesh = plot.mesh3d?.getObjectByName('crop');
          if (cropMesh) {
            const t = progress * 0.5 + 0.5;
            cropMesh.scale.setScalar(Math.min(t, 1.0));
          }
        }
      }

      if (plot.status === 'ready') {
        const cropMesh = plot.mesh3d?.getObjectByName('crop');
        if (cropMesh) {
          cropMesh.position.y = 0.2 + Math.sin(this._time * 2 + plot.gridX) * 0.03;
        }
      }
    }
  }

  expandGrid() {
    const newSize = state.gridSize + 1;
    if (newSize > 5) return false;
    state.gridSize = newSize;
    this.build();
    saveGame();
    return true;
  }

  getGridOffset() {
    const size = state.gridSize;
    return ((size - 1) * CELL_SIZE) / 2;
  }

  getCellSize() { return CELL_SIZE; }
}
