import * as THREE from 'three';
import { state, SELL_PRICES, PRODUCE_ICONS, saveGame } from '../state.js';

export class MarketStall {
  constructor(scene) {
    this._scene = scene;
    this._buildStall();
  }

  _buildStall() {
    const group = new THREE.Group();
    group.name = 'MarketStall';

    const tableMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 1.5), tableMat);
    table.position.y = 0.7;
    table.castShadow = true;
    table.receiveShadow = true;
    group.add(table);

    const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    [[-1.35, 0.35, -0.65], [1.35, 0.35, -0.65], [-1.35, 0.35, 0.65], [1.35, 0.35, 0.65]].forEach(([x,y,z]) => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });

    const awningMat = new THREE.MeshLambertMaterial({ color: 0x1565c0, side: THREE.DoubleSide });
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.5), awningMat);
    awning.rotation.x = -Math.PI * 0.3;
    awning.position.set(0, 1.8, -0.5);
    group.add(awning);

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2);
    [-1.5, 1.5].forEach(x => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 1.1, -1.0);
      pole.castShadow = true;
      group.add(pole);
    });

    group.position.set(6, 0, -4);
    this._scene.add(group);
    this._group = group;

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏪 MARKET', 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sign.position.set(6, 2.8, -4);
    sign.scale.set(3, 0.75, 1);
    this._scene.add(sign);
  }

  listForSale(itemType, qty) {
    const avail = state.inventory[itemType] || 0;
    if (avail < qty) return false;
    state.inventory[itemType] -= qty;
    state.market.available[itemType] = (state.market.available[itemType] || 0) + qty;
    saveGame();
    return true;
  }

  sell(itemType, qty) {
    const listed = state.market.available[itemType] || 0;
    const selling = Math.min(qty, listed);
    if (selling <= 0) return 0;

    const price = SELL_PRICES[itemType] || 5;
    const earned = selling * price;
    state.market.available[itemType] -= selling;
    state.coins += earned;
    window._hud?.refresh();
    window._inventory?.refresh();
    saveGame();
    return earned;
  }

  getAvailable() {
    return { ...state.market.available };
  }

  getStopPosition() {
    return new THREE.Vector3(5, 0, -2);
  }

  getPosition() {
    return this._group.position.clone();
  }
}
