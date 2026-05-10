import * as THREE from 'three';
import { createFoxInstance } from '../assets.js';

const furMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });
const noseMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });

const BEAR_COLOR = 0x6a3a1c;
const FOX_SCALE = 0.022; // Fox.glb is ~70 units; scale to ~1.5 unit world size
const FOX_Y_OFFSET = 0.0;

export function createBearMesh() {
  const fox = createFoxInstance();
  if (fox) {
    const group = new THREE.Group();
    const model = fox.scene;
    // Tint to brown bear. Fox.glb materials are MeshStandardMaterial with a baked-in fur texture;
    // just override the color; texture multiplication keeps detail visible.
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        if (child.material.color) child.material.color.setHex(BEAR_COLOR);
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
    model.scale.setScalar(FOX_SCALE);
    model.position.y = FOX_Y_OFFSET;
    group.add(model);

    // AnimationMixer + clips. Fox has 'Survey' (idle), 'Walk', 'Run'.
    const mixer = new THREE.AnimationMixer(model);
    const walkClip =
      THREE.AnimationClip.findByName(fox.animations, 'Walk') ||
      fox.animations[1] ||
      fox.animations[0];
    const idleClip =
      THREE.AnimationClip.findByName(fox.animations, 'Survey') ||
      fox.animations[0];
    const runClip =
      THREE.AnimationClip.findByName(fox.animations, 'Run') ||
      walkClip;

    const walkAction = mixer.clipAction(walkClip);
    const idleAction = mixer.clipAction(idleClip);
    const runAction = mixer.clipAction(runClip);
    idleAction.play();
    walkAction.play();
    runAction.play();
    walkAction.weight = 0;
    runAction.weight = 0;
    idleAction.weight = 1;

    group.userData.mixer = mixer;
    group.userData.actions = { idle: idleAction, walk: walkAction, run: runAction };
    group.userData.isFox = true;
    return group;
  }
  return createProceduralBearMesh();
}

function createProceduralBearMesh() {
  const group = new THREE.Group();

  // Body: box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 1.2),
    furMat
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Head: smaller box at front
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.5, 0.5),
    furMat
  );
  head.position.set(0, 0.7, 0.7);
  head.castShadow = true;
  group.add(head);

  // Nose
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.14),
    noseMat
  );
  nose.position.set(0, 0.65, 0.97);
  group.add(nose);

  // Ears
  const earGeom = new THREE.BoxGeometry(0.16, 0.16, 0.1);
  for (const x of [-0.18, 0.18]) {
    const ear = new THREE.Mesh(earGeom, furMat);
    ear.position.set(x, 1.0, 0.65);
    ear.castShadow = true;
    group.add(ear);
  }

  // 4 legs
  const legGeom = new THREE.BoxGeometry(0.22, 0.4, 0.22);
  const legPositions = [
    { x:  0.32, z:  0.45 },
    { x: -0.32, z:  0.45 },
    { x:  0.32, z: -0.45 },
    { x: -0.32, z: -0.45 },
  ];
  for (const p of legPositions) {
    const leg = new THREE.Mesh(legGeom, furMat);
    leg.position.set(p.x, 0.2, p.z);
    leg.castShadow = true;
    group.add(leg);
  }

  return group;
}
