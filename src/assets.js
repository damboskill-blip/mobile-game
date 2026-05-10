import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const cache = {
  fox: null, // { scene, animations }
};

let loadPromise = null;

export function loadAssets() {
  if (loadPromise) return loadPromise;
  const loader = new GLTFLoader();
  // Use BASE_URL so this works under GitHub Pages subpath as well as local dev.
  const base = import.meta.env.BASE_URL || '/';
  loadPromise = Promise.all([
    loader.loadAsync(`${base}models/Fox.glb`).then(gltf => {
      cache.fox = { scene: gltf.scene, animations: gltf.animations };
    }),
  ]);
  return loadPromise;
}

export function isFoxLoaded() {
  return cache.fox !== null;
}

export function createFoxInstance() {
  if (!cache.fox) return null;
  const clone = cloneSkeleton(cache.fox.scene);
  return { scene: clone, animations: cache.fox.animations };
}
