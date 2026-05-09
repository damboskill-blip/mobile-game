import * as THREE from 'three';

const padBaseMat = new THREE.MeshLambertMaterial({ color: 0x4a8a6a });
const padFillMat = new THREE.MeshLambertMaterial({ color: 0xffd154 });
const padDoneMat = new THREE.MeshLambertMaterial({ color: 0x88aa66 });

const PAD_RADIUS = 0.95;

export function createPadMesh() {
  const group = new THREE.Group();
  // Disk on the ground
  const baseGeom = new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.06, 24);
  const base = new THREE.Mesh(baseGeom, padBaseMat);
  base.position.y = 0.03;
  base.receiveShadow = true;
  group.add(base);

  // Inner fill ring (deposit progress) — initially 0 scale
  const fillGeom = new THREE.CylinderGeometry(PAD_RADIUS - 0.05, PAD_RADIUS - 0.05, 0.07, 24);
  const fill = new THREE.Mesh(fillGeom, padFillMat);
  fill.position.y = 0.04;
  fill.scale.set(0.001, 1, 0.001);
  group.add(fill);

  group.userData.base = base;
  group.userData.fill = fill;
  return group;
}

export function syncPadMesh(group, pad) {
  const fill = group.userData.fill;
  const base = group.userData.base;
  if (pad.completed && !pad.multiUse) {
    base.material = padDoneMat;
    fill.scale.set(0.001, 1, 0.001);
  } else {
    base.material = padBaseMat;
    const progress = Math.min(1, pad.deposited / pad.cost);
    fill.scale.set(progress, 1, progress);
  }
}
