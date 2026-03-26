import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { playClick } from "./sounds.js";
import { tutorialStep } from "./tutorial.js";
import { scene } from "./renderer.js";
import { carSource } from "./assets.js";
import { storage, addMoney, updateStorageUI, iconImg } from "./farm.js";
import {
  SELL_PRICES, CAR_COLORS,
  CAR_ENTER_X, CAR_EXIT_X, SERVICE_X, QUEUE_GAP, MAX_QUEUE,
  CAR_SPEED, SPAWN_MIN, SPAWN_MAX, CAR_Y, CAR_ROTATION_Y, CAR_LABEL_Y, CAR_PATIENCE,
  CAR_WISH_MIN_TYPES, CAR_WISH_MAX_TYPES, CAR_WISH_MIN_QTY, CAR_WISH_MAX_QTY,
  ROAD_Z,
} from "./config.js";

export const carQueue = [];
export let nextCarSpawn = Infinity;
export function setNextCarSpawn(t) { nextCarSpawn = t; }
export function refreshServingCarLabels() {
  for (const car of carQueue) {
    if (car.state === "serving") refreshCarLabel(car);
  }
}

const PRODUCIBLE_ITEMS = Object.keys(SELL_PRICES);
let _firstCarSpawned   = false;
let _advance           = null;

const carLabelsEl = document.getElementById("car-labels");
const carAlertEl  = document.getElementById("car-alert");

const _carLabelVec = new THREE.Vector3();

export function initCars(advanceFn) { _advance = advanceFn; }

export function updateCarAlert() {
  carAlertEl.classList.toggle("visible", carQueue.some((c) => c.state === "serving"));
}

function queueTargetX(idx) { return SERVICE_X - idx * QUEUE_GAP; }

function generateWishlist() {
  const shuffled = [...PRODUCIBLE_ITEMS].sort(() => Math.random() - 0.5);
  const types = CAR_WISH_MIN_TYPES +
    Math.floor(Math.random() * (CAR_WISH_MAX_TYPES - CAR_WISH_MIN_TYPES + 1));
  const w = {};
  for (let i = 0; i < types; i++)
    w[shuffled[i]] = CAR_WISH_MIN_QTY +
      Math.floor(Math.random() * (CAR_WISH_MAX_QTY - CAR_WISH_MIN_QTY + 1));
  return w;
}

function rebindCarSellButtons(car) {
  car.labelEl.querySelectorAll(".car-sell-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = btn.dataset.item;
      const qty  = Math.min(car.wishlist[item] || 0, storage[item] || 0);
      if (qty <= 0) return;
      playClick();
      storage[item]      -= qty;
      car.wishlist[item] -= qty;
      addMoney(qty * SELL_PRICES[item]);
      updateStorageUI();
      _advance?.("done");
      refreshCarLabel(car);
      if (Object.values(car.wishlist).every((v) => v <= 0)) startCarExit(car);
    });
  });
}

export function refreshCarLabel(car) {
  if (!car.labelEl) return;
  const isServing = car.state === "serving";
  car.labelEl.style.display = isServing ? "block" : "none";
  if (!isServing) return;

  const remaining = Object.entries(car.wishlist).filter(([, v]) => v > 0);
  if (!remaining.length) { car.labelEl.style.display = "none"; return; }

  const rows = remaining.map(([key, qty]) => {
    const icon    = iconImg(key, 28);
    const has     = storage[key] || 0;
    const sellQty = Math.min(has, qty);
    const price   = sellQty * SELL_PRICES[key];
    const btn = has > 0
      ? `<button class="car-sell-btn" data-item="${key}">Sell ${sellQty} (+${price}🪙)</button>`
      : `<span class="car-need">${icon} ×${qty}</span>`;
    return `<div class="car-item">${has > 0 ? `<span>${icon} ×${qty}</span>` : ""}${btn}</div>`;
  }).join("");

  const showPass = tutorialStep() === "done";
  car.labelEl.innerHTML = rows +
    (showPass ? `<div class="car-pass-row"><button class="car-pass-btn">Pass</button></div>` : "");

  rebindCarSellButtons(car);
  car.labelEl.querySelector(".car-pass-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    startCarExit(car);
  });
}

export function updateCarLabelPos(car, camera) {
  if (!car.labelEl || car.state !== "serving") return;
  _carLabelVec.copy(car.mesh.position);
  _carLabelVec.y += CAR_LABEL_Y;
  _carLabelVec.project(camera);
  car.labelEl.style.left = `${(_carLabelVec.x *  0.5 + 0.5) * innerWidth}px`;
  car.labelEl.style.top  = `${(_carLabelVec.y * -0.5 + 0.5) * innerHeight}px`;
}

export function startCarExit(car) {
  if (car.state === "exiting") return;
  car.state    = "exiting";
  car.targetX  = CAR_EXIT_X;
  refreshCarLabel(car);
  updateCarAlert();
}

function advanceQueue() {
  for (let i = 0; i < carQueue.length; i++) {
    const car = carQueue[i];
    car.targetX = queueTargetX(i);
    if (car.state === "serving") car.state = "moving";
    refreshCarLabel(car);
  }
}

export function spawnCar(onSpawned) {
  if (!carSource || carQueue.length >= MAX_QUEUE) return;

  const mesh     = SkeletonUtils.clone(carSource);
  const carColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  mesh.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
      const name = (n.name || "").toLowerCase();
      if (
        name.includes("cube_material008_0") &&
        n.material &&
        !Array.isArray(n.material) &&
        n.material.opacity >= 0.9
      ) {
        n.material = n.material.clone();
        n.material.color.setHex(carColor);
      }
    }
  });
  mesh.position.set(CAR_ENTER_X, CAR_Y, ROAD_Z);
  mesh.rotation.y = CAR_ROTATION_Y;
  scene.add(mesh);

  const labelEl = document.createElement("div");
  labelEl.className     = "car-label";
  labelEl.style.display = "none";
  carLabelsEl.appendChild(labelEl);

  const isFirstEver = !_firstCarSpawned && carQueue.length === 0;
  _firstCarSpawned  = true;

  const car = {
    mesh,
    labelEl,
    wishlist: isFirstEver ? { corn: 1 } : generateWishlist(),
    state:    "moving",
    targetX:  queueTargetX(carQueue.length),
  };
  carQueue.push(car);

  onSpawned?.(car);
}

export function tickCars(delta, nowSec, tutStepIdx, carWaitIdx, camera, onCarArrived) {
  const tutBlocking = tutStepIdx >= 0 && tutStepIdx < carWaitIdx;

  if (nowSec >= nextCarSpawn && carQueue.length < MAX_QUEUE && !tutBlocking) {
    spawnCar(onCarArrived);
    nextCarSpawn = nowSec + SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  }

  for (let i = carQueue.length - 1; i >= 0; i--) {
    const car = carQueue[i];

    if (car.state === "moving" || car.state === "exiting") {
      const dx   = car.targetX - car.mesh.position.x;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), CAR_SPEED * delta);
      car.mesh.position.x += step;

      if (Math.abs(dx) <= 0.05) {
        car.mesh.position.x = car.targetX;
        if (car.state === "exiting") {
          scene.remove(car.mesh);
          car.labelEl?.remove();
          carQueue.splice(i, 1);
          advanceQueue();
          updateCarAlert();
        } else if (i === 0) {
          car.state          = "serving";
          car.serveStartTime = nowSec;
          refreshCarLabel(car);
          updateCarAlert();
          if (tutorialStep() === "car_wait") _advance?.("sell");
        }
      }
    } else if (car.state === "serving") {
      updateCarLabelPos(car, camera);
      if (nowSec - car.serveStartTime > CAR_PATIENCE) startCarExit(car);
    }
  }
}
