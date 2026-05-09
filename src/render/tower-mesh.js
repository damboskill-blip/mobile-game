import * as THREE from 'three';

const baseMat = new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
const turretMat = new THREE.MeshLambertMaterial({ color: 0x8a4a3a });
const beamL1 = new THREE.MeshLambertMaterial({ color: 0xffd154 });
const beamL2 = new THREE.MeshLambertMaterial({ color: 0xff7a3a });
const beamL3 = new THREE.MeshLambertMaterial({ color: 0xc83a3a });

export function createTowerMesh() {
  const group = new THREE.Group();
  // Wide stone base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.4, 8),
    baseMat
  );
  base.position.y = 0.2;
  base.castShadow = true;
  group.add(base);

  // Tower body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 1.4, 8),
    baseMat
  );
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  // Turret on top
  const turret = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.7),
    turretMat
  );
  turret.position.y = 1.95;
  turret.castShadow = true;
  group.add(turret);

  group.userData.turret = turret;
  return group;
}

export function applyTowerLevel(group, tower) {
  // Scale turret with level for visual progression
  const turret = group.userData.turret;
  const s = 1 + (tower.level - 1) * 0.18;
  turret.scale.set(s, s, s);
  if (tower.level === 1) turret.material = beamL1;
  else if (tower.level === 2) turret.material = beamL2;
  else turret.material = beamL3;
}

export function setTowerRotationToTarget(group, towerPos, targetPos) {
  const turret = group.userData.turret;
  if (!targetPos) return;
  const dx = targetPos.x - towerPos.x;
  const dz = targetPos.z - towerPos.z;
  turret.rotation.y = Math.atan2(dx, dz);
}
