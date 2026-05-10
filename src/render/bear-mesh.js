import * as THREE from 'three';
import { createInstance, tintInstance, enableShadows } from '../assets.js';

const furMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });
const noseMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });

const BEAR_TINT = 0x4a2a14; // dark brown
const BEAR_SCALE = 0.55;    // Wolf model is large; scale way down to fit world

export function createBearMesh() {
  const inst = createInstance('bear');
  if (inst) {
    const group = new THREE.Group();
    const model = inst.scene;
    tintInstance(model, BEAR_TINT);
    enableShadows(model);
    model.scale.setScalar(BEAR_SCALE);
    // Wolf model faces -Z natively; bear AI rotates to face target via group.rotation.y,
    // so model itself should be neutral (face +Z when group rot=0).
    // Test result: removing Math.PI makes them face the right direction.
    group.add(model);

    // Animation mixer with Wolf's baked clips
    if (inst.animations && inst.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      const idleClip =
        THREE.AnimationClip.findByName(inst.animations, 'AnimalArmature|Idle') ||
        THREE.AnimationClip.findByName(inst.animations, 'Idle') ||
        inst.animations[0];
      const walkClip =
        THREE.AnimationClip.findByName(inst.animations, 'AnimalArmature|Walk') ||
        THREE.AnimationClip.findByName(inst.animations, 'Walk') ||
        idleClip;
      const attackClip =
        THREE.AnimationClip.findByName(inst.animations, 'AnimalArmature|Attack') ||
        THREE.AnimationClip.findByName(inst.animations, 'Attack') ||
        idleClip;

      const idleAction = mixer.clipAction(idleClip);
      const walkAction = mixer.clipAction(walkClip);
      const attackAction = mixer.clipAction(attackClip);
      idleAction.play();
      walkAction.play();
      attackAction.play();
      idleAction.weight = 1;
      walkAction.weight = 0;
      attackAction.weight = 0;

      group.userData.mixer = mixer;
      group.userData.actions = { idle: idleAction, walk: walkAction, attack: attackAction };
      group.userData.isAnimatedBear = true;
    }
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
