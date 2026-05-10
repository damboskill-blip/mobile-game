import * as THREE from 'three';
import { createInstance, tintInstance, enableShadows } from '../assets.js';

const furMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });
const noseMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });

const BEAR_TINT = 0x4a2a14; // dark brown
const BEAR_SCALE = 1.6;     // Quaternius animals are ~1 unit; bump for bear feel

export function createBearMesh() {
  const inst = createInstance('bear');
  if (inst) {
    const group = new THREE.Group();
    const model = inst.scene;
    tintInstance(model, BEAR_TINT);
    enableShadows(model);
    model.scale.setScalar(BEAR_SCALE);
    // Quaternius models often face -Z; rotate 180 if needed
    model.rotation.y = Math.PI;
    group.add(model);
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
