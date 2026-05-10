import * as THREE from 'three';
import { BALANCE } from '../balance.js';
import { getGrassTexture } from './textures.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1410);
  scene.fog = new THREE.Fog(0x1a1410, 25, 60);

  // Hemisphere fill — sky/ground colors
  const hemi = new THREE.HemisphereLight(0xc8e4ff, 0x4a3a28, 0.6);
  scene.add(hemi);

  // Warm directional sun
  const sun = new THREE.DirectionalLight(0xffe1b3, 1.1);
  sun.position.set(20, 30, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Ground plane — slightly larger than play area
  const groundSize = (BALANCE.base.radius + 10) * 2;
  const groundGeo = new THREE.CircleGeometry(groundSize / 2, 48);
  const groundMat = new THREE.MeshLambertMaterial({ map: getGrassTexture() });
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}
