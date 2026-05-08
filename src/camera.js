import * as THREE from 'three';

const FOV = 35;
const DISTANCE = 18;
const ANGLE_RAD = Math.PI / 180 * 55;
const FOLLOW_LERP = 0.08;

export function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100);
  camera.lookAtTarget = { x: 0, z: 0 };
  return camera;
}

export function updateCamera(camera, world) {
  const t = camera.lookAtTarget;
  t.x += (world.player.pos.x - t.x) * FOLLOW_LERP;
  t.z += (world.player.pos.z - t.z) * FOLLOW_LERP;

  // Camera offset behind+above target
  const offsetXZ = DISTANCE * Math.cos(ANGLE_RAD);
  const offsetY = DISTANCE * Math.sin(ANGLE_RAD);

  camera.position.set(t.x, offsetY, t.z + offsetXZ);
  camera.lookAt(t.x, 0, t.z);
}

export function handleResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
