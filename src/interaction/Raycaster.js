import * as THREE from 'three';

export class FarmRaycaster {
  constructor(canvas, camera, scene, interactiveObjects) {
    this._canvas = canvas;
    this._camera = camera;
    this._scene = scene;
    this._objects = interactiveObjects;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._hoveredMesh = null;
    this._originalEmissive = null;
    this._handlers = {};

    this._tooltip = document.getElementById('tooltip');
    if (!this._tooltip) {
      this._tooltip = document.createElement('div');
      this._tooltip.id = 'tooltip';
      document.body.appendChild(this._tooltip);
    }

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);

    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerdown', this._onPointerDown);
  }

  setHandlers(handlers) {
    this._handlers = handlers;
  }

  _getNormalizedMouse(event) {
    const rect = this._canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  _getIntersect(mouse) {
    this._raycaster.setFromCamera(mouse, this._camera);
    const hits = this._raycaster.intersectObjects(this._objects, true);
    return hits[0] || null;
  }

  _findTaggedParent(object) {
    let obj = object;
    while (obj) {
      if (obj.userData && obj.userData.type) return obj;
      obj = obj.parent;
    }
    return null;
  }

  _onPointerMove(event) {
    if (event.target !== this._canvas) return;

    const mouse = this._getNormalizedMouse(event);
    const hit = this._getIntersect(mouse);

    if (this._hoveredMesh && this._originalEmissive !== null) {
      this._hoveredMesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      });
      this._hoveredMesh = null;
    }
    this._tooltip.style.display = 'none';

    if (!hit) return;

    const tagged = this._findTaggedParent(hit.object);
    if (!tagged) return;

    const ref = tagged.userData.ref;
    const type = tagged.userData.type;

    this._hoveredMesh = tagged;
    this._originalEmissive = true;
    tagged.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.emissive = new THREE.Color(0xffdd00);
        child.material.emissiveIntensity = 0.25;
      }
    });

    let tipText = '';
    if (type === 'plot' && ref) {
      if (ref.status === 'empty') tipText = '🌱 Click to plant';
      else if (ref.status === 'planted') tipText = '🌱 Growing...';
      else if (ref.status === 'growing') tipText = `🌿 Growing (${ref.crop})`;
      else if (ref.status === 'ready') tipText = `✅ Click to harvest ${ref.crop}!`;
    } else if (type === 'animal' && ref) {
      if (ref.hasProduct) {
        tipText = `✅ Click to collect ${ref.produceType}!`;
      } else {
        const remaining = Math.max(0, Math.ceil(
          (ref.lastProducedAt + ref.produceInterval - Date.now()) / 1000
        ));
        tipText = `⏳ ${ref.type}: ${remaining}s until ${ref.produceType}`;
      }
    }

    if (tipText) {
      this._tooltip.textContent = tipText;
      this._tooltip.style.display = 'block';
      this._tooltip.style.left = (event.clientX + 14) + 'px';
      this._tooltip.style.top  = (event.clientY - 30) + 'px';
    }
  }

  _onPointerDown(event) {
    if (event.target !== this._canvas) return;
    if (event.button !== 0) return;

    const mouse = this._getNormalizedMouse(event);
    const hit = this._getIntersect(mouse);
    if (!hit) return;

    const tagged = this._findTaggedParent(hit.object);
    if (!tagged) return;

    const type = tagged.userData.type;
    const ref = tagged.userData.ref;

    if (type === 'plot' && this._handlers.plot) {
      this._handlers.plot(ref);
    } else if (type === 'animal' && this._handlers.animal) {
      this._handlers.animal(ref);
    }
  }

  destroy() {
    this._canvas.removeEventListener('pointermove', this._onPointerMove);
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
  }
}
