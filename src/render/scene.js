import * as THREE from 'three';
import { BALANCE } from '../balance.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1410);
  scene.fog = new THREE.Fog(0x1a1410, 25, 60);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0c8, 1.0);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  scene.add(sun);

  // Ground plane — slightly larger than play area
  const groundSize = (BALANCE.base.radius + 10) * 2;
  const groundGeo = new THREE.CircleGeometry(groundSize / 2, 48);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a6a3a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  return scene;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  return renderer;
}
