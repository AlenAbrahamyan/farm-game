import * as THREE from "three";
import {
  SKY_COLOR, FOG_DENSITY,
  CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CAMERA_POS,
  AMBIENT_COLOR, AMBIENT_INTENSITY,
  SUN_COLOR, SUN_INTENSITY, SUN_POS,
  SUN_SHADOW_SIZE, SUN_SHADOW_NEAR, SUN_SHADOW_FAR, SUN_SHADOW_EXTENT, SUN_SHADOW_BIAS,
  TONE_EXPOSURE, GROUND_COLOR, GROUND_SIZE, GROUND_Y,
  ROAD_Z, ROAD_WIDTH, ROAD_LENGTH,
} from "./config.js";

const canvas = document.getElementById("game-canvas");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_EXPOSURE;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.FogExp2(SKY_COLOR, FOG_DENSITY);

export const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV, innerWidth / innerHeight, CAMERA_NEAR, CAMERA_FAR,
);
camera.position.set(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z);
camera.lookAt(0, 0, 0);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY));

const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
sun.position.set(SUN_POS.x, SUN_POS.y, SUN_POS.z);
sun.castShadow = true;
sun.shadow.mapSize.set(SUN_SHADOW_SIZE, SUN_SHADOW_SIZE);
sun.shadow.camera.near = SUN_SHADOW_NEAR;
sun.shadow.camera.far = SUN_SHADOW_FAR;
sun.shadow.camera.left = sun.shadow.camera.bottom = -SUN_SHADOW_EXTENT;
sun.shadow.camera.right = sun.shadow.camera.top = SUN_SHADOW_EXTENT;
sun.shadow.bias = SUN_SHADOW_BIAS;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
  new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);

const roadSurface = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH),
  new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
);
roadSurface.rotation.x = -Math.PI / 2;
roadSurface.position.set(0, -0.04, ROAD_Z);
roadSurface.receiveShadow = true;
scene.add(roadSurface);

const centerLine = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_LENGTH, 0.08),
  new THREE.MeshLambertMaterial({ color: 0xffd700 }),
);
centerLine.rotation.x = -Math.PI / 2;
centerLine.position.set(0, -0.03, ROAD_Z);
scene.add(centerLine);

for (const dz of [-ROAD_WIDTH / 2, ROAD_WIDTH / 2]) {
  const kerb = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_LENGTH, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
  );
  kerb.rotation.x = -Math.PI / 2;
  kerb.position.set(0, -0.03, ROAD_Z + dz);
  scene.add(kerb);
}
