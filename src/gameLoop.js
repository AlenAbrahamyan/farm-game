import * as THREE from 'three';

export class GameLoop {
  constructor() {
    this._clock = new THREE.Clock();
    this._modules = [];
    this._running = false;
    this._animId = null;
  }

  register(module) {
    if (module && typeof module.update === 'function') {
      this._modules.push(module);
    }
  }

  start() {
    this._running = true;
    this._clock.start();
    this._tick();
  }

  stop() {
    this._running = false;
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  _tick() {
    if (!this._running) return;
    this._animId = requestAnimationFrame(() => this._tick());
    const delta = Math.min(this._clock.getDelta(), 0.1);
    for (const mod of this._modules) {
      try { mod.update(delta); } catch (e) { console.error(e); }
    }
  }
}
