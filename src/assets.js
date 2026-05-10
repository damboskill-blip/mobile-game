import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const MODELS = {
  bear: 'bear.glb',
  player: 'adventurer.glb',
  customerA: 'casual.glb',
  customerB: 'casual2.glb',
  cook: 'farmer.glb',
  cashier: 'suit.glb',
  worker: 'worker.glb',     // porter + repairman
  tanner: 'farmer.glb',     // reuse farmer
  premiumCustomer: 'king.glb',
  fire: 'fire.glb',
  register: 'register.glb',
  leatherCounter: 'leather-counter.glb',
  tannery: 'tannery.glb',
  fence: 'fence.glb',
  tower: 'tower.glb',
};

const cache = {};
let loadPromise = null;

export function loadAssets() {
  if (loadPromise) return loadPromise;
  const loader = new GLTFLoader();
  // Use BASE_URL so this works under GitHub Pages subpath as well as local dev.
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  // Dedupe URLs so we don't double-download (cook/tanner both use farmer.glb, etc.)
  const urlCache = new Map();
  loadPromise = Promise.all(
    Object.entries(MODELS).map(async ([key, file]) => {
      let p = urlCache.get(file);
      if (!p) {
        p = loader.loadAsync(`${base}models/${file}`);
        urlCache.set(file, p);
      }
      try {
        const gltf = await p;
        cache[key] = { scene: gltf.scene, animations: gltf.animations || [] };
      } catch (err) {
        console.warn(`Failed to load model ${file}:`, err);
        cache[key] = null;
      }
    })
  );
  return loadPromise;
}

export function isAssetLoaded(key) {
  return cache[key] != null;
}

export function createInstance(key) {
  const entry = cache[key];
  if (!entry) return null;
  const clone = cloneSkeleton(entry.scene);
  return { scene: clone, animations: entry.animations };
}

// Convenience: tint a cloned scene's meshes by overriding material color
export function tintInstance(scene, hex) {
  scene.traverse(child => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      if (child.material.color) child.material.color.setHex(hex);
    }
  });
}

// Convenience: ensure all meshes cast shadow
export function enableShadows(scene) {
  scene.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}
