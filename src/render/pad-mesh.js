import * as THREE from 'three';

const padBaseMat = new THREE.MeshLambertMaterial({ color: 0x4a8a6a });
const padTowerBaseMat = new THREE.MeshLambertMaterial({ color: 0x6a4a4a });
const padFillMat = new THREE.MeshLambertMaterial({ color: 0xffd154 });
const padDoneMat = new THREE.MeshLambertMaterial({ color: 0x88aa66 });

const PAD_RADIUS = 0.95;

export function createPadMesh(type) {
  const group = new THREE.Group();
  const isTower = type === 'build-tower';
  const baseMaterial = isTower ? padTowerBaseMat : padBaseMat;

  const baseGeom = new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.06, 24);
  const base = new THREE.Mesh(baseGeom, baseMaterial);
  base.position.y = 0.03;
  base.receiveShadow = true;
  group.add(base);

  const fillGeom = new THREE.CylinderGeometry(PAD_RADIUS - 0.05, PAD_RADIUS - 0.05, 0.07, 24);
  const fill = new THREE.Mesh(fillGeom, padFillMat);
  fill.position.y = 0.04;
  fill.scale.set(0.001, 1, 0.001);
  group.add(fill);

  group.userData.base = base;
  group.userData.fill = fill;
  group.userData.baseMaterial = baseMaterial;
  return group;
}

export function syncPadMesh(group, pad) {
  const fill = group.userData.fill;
  const base = group.userData.base;
  const isTowerMaxed = pad.type === 'build-tower' && pad.level >= 3;
  if (isTowerMaxed) {
    base.material = padDoneMat;
    fill.scale.set(0.001, 1, 0.001);
  } else {
    base.material = group.userData.baseMaterial;
    const progress = Math.min(1, pad.deposited / pad.cost);
    fill.scale.set(progress, 1, progress);
  }
}
