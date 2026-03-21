import * as THREE from "three";
import { state, SELL_PRICES, PRODUCE_ICONS } from "../state.js";

const MAX_CARS = 3;
const CAR_SPEED = 0.15;
const STOP_T = 0.55;
const BUY_DURATION = 4;

function buildRoadPath() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-22, 0.1, -6),
    new THREE.Vector3(-12, 0.1, -5),
    new THREE.Vector3(-2, 0.1, -4),
    new THREE.Vector3(5, 0.1, -2.5),
    new THREE.Vector3(10, 0.1, -1),
    new THREE.Vector3(18, 0.1, 1),
    new THREE.Vector3(25, 0.1, 2),
  ]);
}

let _carId = 0;

export class CarQueue {
  constructor(scene, meshLibrary, marketStall, camera) {
    this._scene = scene;
    this._lib = meshLibrary;
    this._market = marketStall;
    this._camera = camera;
    this._road = buildRoadPath();
    this._bubblesEl = document.getElementById("car-bubbles");
    this._time = 0;
    this._nextSpawnIn = this._randomSpawnDelay();

    if (import.meta.env.DEV) {
      this._drawDebugPath();
    }
  }

  _drawDebugPath() {
    const points = this._road.getPoints(50);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this._scene.add(new THREE.Line(geo, mat));
  }

  _randomSpawnDelay() {
    return 20 + Math.random() * 30;
  }

  _spawnCar() {
    if (state.carQueue.length >= MAX_CARS) return;

    const available = this._market.getAvailable();
    const hasItems = Object.values(available).some((v) => v > 0);
    if (!hasItems) return;

    const carMesh = this._lib.carTemplate.clone(true);
    this._normalizeCar(carMesh);
    carMesh.castShadow = true;
    this._scene.add(carMesh);

    const startPos = this._road.getPoint(0);
    carMesh.position.copy(startPos);

    const wantsToBuy = this._pickShoppingList(available);

    const car = {
      id: `car_${_carId++}`,
      status: "approaching",
      mesh3d: carMesh,
      pathT: 0,
      wantsToBuy,
      buyTimer: 0,
      bubble: null,
    };

    state.carQueue.push(car);
  }

  _normalizeCar(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.z, 0.01);
    const scale = 1.6 / maxDim;
    obj.scale.setScalar(scale);

    const minY = box.min.y * scale;
    obj.position.y = -minY * scale;
  }

  _pickShoppingList(available) {
    const shopping = {};
    const items = Object.entries(available).filter(([, qty]) => qty > 0);
    if (items.length === 0) return shopping;

    const shuffle = [...items].sort(() => Math.random() - 0.5);
    const picks = shuffle.slice(0, Math.min(2, shuffle.length));
    for (const [item, qty] of picks) {
      shopping[item] = Math.min(qty, 1 + Math.floor(Math.random() * 3));
    }
    return shopping;
  }

  _startBuying(car) {
    car.status = "buying";
    car.buyTimer = 0;
    this._showBubble(car);
  }

  _finishBuying(car) {
    let totalEarned = 0;
    for (const [item, qty] of Object.entries(car.wantsToBuy)) {
      const earned = this._market.sell(item, qty);
      totalEarned += earned;
    }
    if (totalEarned > 0) {
      window._hud?.toast(`Car bought items for ${totalEarned} 🪙!`);
    }
    this._removeBubble(car);
    car.status = "leaving";
  }

  _showBubble(car) {
    const items = Object.entries(car.wantsToBuy)
      .filter(([, qty]) => qty > 0)
      .map(([item, qty]) => `${PRODUCE_ICONS[item] || item} x${qty}`)
      .join(" ");

    const div = document.createElement("div");
    div.className = "car-bubble";
    div.textContent = items || "...";
    this._bubblesEl.appendChild(div);
    car.bubble = div;
  }

  _removeBubble(car) {
    if (car.bubble) {
      car.bubble.remove();
      car.bubble = null;
    }
  }

  _updateBubblePosition(car) {
    if (!car.bubble || !car.mesh3d) return;
    const pos = car.mesh3d.position.clone();
    pos.y += 2;
    const projected = pos.project(this._camera);
    const x = ((projected.x + 1) / 2) * window.innerWidth;
    const y = ((-projected.y + 1) / 2) * window.innerHeight;
    car.bubble.style.left = x + "px";
    car.bubble.style.top = y - 40 + "px";
  }

  _removeCar(car) {
    this._removeBubble(car);
    this._scene.remove(car.mesh3d);
    const idx = state.carQueue.indexOf(car);
    if (idx !== -1) state.carQueue.splice(idx, 1);
  }

  update(delta) {
    this._time += delta;

    this._nextSpawnIn -= delta;
    if (this._nextSpawnIn <= 0) {
      this._spawnCar();
      this._nextSpawnIn = this._randomSpawnDelay();
    }

    const Z_AXIS = new THREE.Vector3(0, 0, 1);
    for (const car of [...state.carQueue]) {
      if (car.status === "approaching") {
        const distToStop = STOP_T - car.pathT;
        const speed =
          distToStop < 0.15 ? CAR_SPEED * (distToStop / 0.15) : CAR_SPEED;
        car.pathT += Math.max(speed * delta, 0.001);

        if (car.pathT >= STOP_T) {
          car.pathT = STOP_T;
          this._startBuying(car);
        }
      } else if (car.status === "buying") {
        car.buyTimer += delta;
        if (car.buyTimer >= BUY_DURATION) {
          this._finishBuying(car);
        }
      } else if (car.status === "leaving") {
        car.pathT += CAR_SPEED * delta;
        if (car.pathT >= 1.0) {
          this._removeCar(car);
          continue;
        }
      }

      if (car.mesh3d && car.pathT <= 1.0) {
        const pos = this._road.getPoint(car.pathT);
        const tangent = this._road.getTangent(car.pathT);
        car.mesh3d.position.copy(pos);

        if (tangent.length() > 0.01) {
          const angle = Math.atan2(tangent.x, tangent.z);
          car.mesh3d.rotation.y = angle;
        }

        if (car.status !== "buying") {
          car.mesh3d.position.y += Math.sin(this._time * 8) * 0.01;
        }

        this._updateBubblePosition(car);
      }
    }
  }
}
