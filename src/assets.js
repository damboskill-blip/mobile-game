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

// Quaternius modular_men ship in T-pose with no idle animation. Manually
// pose the skeleton so arms hang along the body.
// Access bones via SkinnedMesh.skeleton.bones (canonical Three.js path) —
// scene.traverse + isBone was unreliable after SkeletonUtils.clone.
const SHOULDER_BONE_NAMES = new Set(['Shoulder.L', 'Shoulder.R']);
const UPPERARM_BONE_NAMES = new Set(['UpperArm.L', 'UpperArm.R']);

export function poseArmsDown(scene) {
  const seenBones = new Set();
  scene.traverse(child => {
    if (!child.isSkinnedMesh || !child.skeleton) return;
    for (const bone of child.skeleton.bones) {
      if (!bone || seenBones.has(bone)) continue;
      seenBones.add(bone);
      if (SHOULDER_BONE_NAMES.has(bone.name)) {
        const sign = bone.name.endsWith('.L') ? -1 : 1;
        // Apply rotation around all three axes — Quaternius rig orientation
        // varies; we attack from multiple angles so at least one produces
        // visible arm-down. The combined Euler still resolves correctly.
        bone.rotation.set(0, 0, sign * (Math.PI / 2.1));
      } else if (UPPERARM_BONE_NAMES.has(bone.name)) {
        const sign = bone.name.endsWith('.L') ? -1 : 1;
        bone.rotation.set(0, 0, sign * (Math.PI / 8));
      }
    }
    child.skeleton.update();
  });
}
