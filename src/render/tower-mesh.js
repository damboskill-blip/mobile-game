import * as THREE from 'three';
import { getStoneTexture } from './textures.js';
import { createInstance, enableShadows } from '../assets.js';

export function createTowerMesh() {
  const group = new THREE.Group();

  const inst = createInstance('tower');
  if (inst) {
    enableShadows(inst.scene);
    inst.scene.scale.setScalar(1.0);
    group.add(inst.scene);
    // Use the whole model as "turret" so rotation-toward-target works
    group.userData.turret = inst.scene;
  } else {
    const proc = createProceduralTower();
    group.add(proc);
    group.userData.turret = proc.userData.turret;
  }

  return group;
}

export function applyTowerLevel(group, tower) {
  const turret = group.userData.turret;
  if (!turret) return;
  const s = 1 + (tower.level - 1) * 0.18;
  turret.scale.setScalar(s);
  // Color tint per level via traversal (only applied to GLTF path)
  const colors = [0xffd154, 0xff7a3a, 0xc83a3a];
  const tint = colors[Math.min(tower.level - 1, 2)];
  turret.traverse(child => {
    if (child.isMesh && child.material && child.material.color) {
      if (!child.userData.cloned) {
        child.material = child.material.clone();
        child.userData.cloned = true;
      }
      child.material.color.setHex(tint);
    }
  });
}

export function setTowerRotationToTarget(group, towerPos, targetPos) {
  const turret = group.userData.turret;
  if (!turret || !targetPos) return;
  const dx = targetPos.x - towerPos.x;
  const dz = targetPos.z - towerPos.z;
  turret.rotation.y = Math.atan2(dx, dz);
}

function createProceduralTower() {
  const baseMat = new THREE.MeshLambertMaterial({ map: getStoneTexture() });
  const turretMat = new THREE.MeshLambertMaterial({ color: 0x8a4a3a });
  const beamL1 = new THREE.MeshLambertMaterial({ color: 0xffd154 });

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
