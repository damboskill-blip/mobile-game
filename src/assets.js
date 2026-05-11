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

// Quaternius modular_men ship in T-pose. Each shoulder bone has a complex
// bind-pose quaternion; overwriting with Euler-angles wipes the bind and
// produces unpredictable orientations. Instead, store the original bind
// quaternion per bone and apply a DELTA rotation on top each frame.
// Three.js / GLTFLoader strips the dot from bone names: "Shoulder.L" in
// the GLB becomes "ShoulderL" at runtime. Match the runtime spelling.
const SHOULDER_BONE_NAMES = new Set(['ShoulderL', 'ShoulderR', 'Shoulder.L', 'Shoulder.R']);
const UPPERARM_BONE_NAMES = new Set(['UpperArmL', 'UpperArmR', 'UpperArm.L', 'UpperArm.R']);

const bindQuaternions = new WeakMap();

// Pre-compute delta quaternions. Try Z axis first; if wrong direction we'll
// flip sign. For Quaternius rig: Z swings arm in the YZ plane around the
// shoulder pivot, which from T-pose folds it down.
const _axisZ = new THREE.Vector3(0, 0, 1);
const DELTA_SHOULDER_L = new THREE.Quaternion().setFromAxisAngle(_axisZ, Math.PI / 2.1);
const DELTA_SHOULDER_R = new THREE.Quaternion().setFromAxisAngle(_axisZ, -Math.PI / 2.1);
const DELTA_UPPER_L = new THREE.Quaternion().setFromAxisAngle(_axisZ, Math.PI / 10);
const DELTA_UPPER_R = new THREE.Quaternion().setFromAxisAngle(_axisZ, -Math.PI / 10);

// Diagnostic: count last invocation. main.js can surface this.
let _lastDiag = { skinnedMeshes: 0, bonesPosed: 0, namesSeen: [] };
export function getPoseDiag() { return _lastDiag; }

export function poseArmsDown(scene) {
  let skinnedCount = 0;
  let bonesPosed = 0;
  const namesSeen = new Set();
  scene.traverse(child => {
    if (!child.isSkinnedMesh || !child.skeleton) return;
    skinnedCount++;
    for (const bone of child.skeleton.bones) {
      if (!bone) continue;
      namesSeen.add(bone.name);
      let delta = null;
      if (bone.name === 'ShoulderL' || bone.name === 'Shoulder.L') delta = DELTA_SHOULDER_L;
      else if (bone.name === 'ShoulderR' || bone.name === 'Shoulder.R') delta = DELTA_SHOULDER_R;
      else if (bone.name === 'UpperArmL' || bone.name === 'UpperArm.L') delta = DELTA_UPPER_L;
      else if (bone.name === 'UpperArmR' || bone.name === 'UpperArm.R') delta = DELTA_UPPER_R;
      if (!delta) continue;
      let bind = bindQuaternions.get(bone);
      if (!bind) {
        bind = bone.quaternion.clone();
        bindQuaternions.set(bone, bind);
      }
      // bone.quaternion = bind * delta (apply rotation in local frame)
      bone.quaternion.copy(bind).multiply(delta);
      bonesPosed++;
    }
    child.skeleton.update();
  });
  _lastDiag = { skinnedMeshes: skinnedCount, bonesPosed, namesSeen: [...namesSeen] };
}
