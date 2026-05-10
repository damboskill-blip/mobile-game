import * as THREE from 'three';
import { getWoodTexture } from './textures.js';
import { createInstance, enableShadows } from '../assets.js';

const woodMat = new THREE.MeshLambertMaterial({ map: getWoodTexture() });
const rawQueueMat = new THREE.MeshLambertMaterial({ color: 0xc04a3a });
const QUEUE_PIECE_H = 0.16;
const queuePieceGeom = new THREE.BoxGeometry(0.32, QUEUE_PIECE_H, 0.45);

export function createFireMesh() {
  const group = new THREE.Group();

  const inst = createInstance('fire');
  if (inst) {
    enableShadows(inst.scene);
    inst.scene.scale.setScalar(2.8);
    group.add(inst.scene);
  } else {
    group.add(createProceduralFire());
  }

  // Queue stack table (always procedural — gameplay UI element)
  const queueStack = new THREE.Group();
  queueStack.position.set(1.6, 0, 0);
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), woodMat);
  table.position.y = 0.25;
  table.castShadow = true;
  queueStack.add(table);
  const stackGroup = new THREE.Group();
  stackGroup.position.y = 0.5;
  queueStack.add(stackGroup);
  group.add(queueStack);
  group.userData.queueStackGroup = stackGroup;

  return group;
}

export function syncFireQueueStack(group, count) {
  const stack = group.userData.queueStackGroup;
  if (!stack) return;
  const display = Math.min(count, 12);
  while (stack.children.length > display) stack.children.pop();
  while (stack.children.length < display) {
    const piece = new THREE.Mesh(queuePieceGeom, rawQueueMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, i * QUEUE_PIECE_H, 0);
  }
}

export function tickFireFlicker() {
  // No-op when using GLTF bonfire (flames are part of static model). Kept
  // for backward compat with main.js.
}

function createProceduralFire() {
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
  const procWoodMat = new THREE.MeshLambertMaterial({ color: 0x4a2c14 });
  const flameOrange = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.9 });
  const flameYellow = new THREE.MeshBasicMaterial({ color: 0xffd154, transparent: true, opacity: 0.85 });

  const group = new THREE.Group();

  // Stone ring base — 8 stones in a circle
  const stoneGeom = new THREE.SphereGeometry(0.18, 6, 5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(stoneGeom, stoneMat);
    stone.position.set(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55);
    stone.castShadow = true;
    group.add(stone);
  }

  // Crossed wood logs
  const logGeom = new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6);
  const log1 = new THREE.Mesh(logGeom, procWoodMat);
  log1.rotation.z = Math.PI / 2;
  log1.position.y = 0.18;
  log1.castShadow = true;
  group.add(log1);

  const log2 = new THREE.Mesh(logGeom, procWoodMat);
  log2.rotation.x = Math.PI / 2;
  log2.position.y = 0.22;
  log2.castShadow = true;
  group.add(log2);

  // Flames (two cones for variety)
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 8), flameOrange);
  outerFlame.position.y = 0.65;
  group.add(outerFlame);

  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), flameYellow);
  innerFlame.position.y = 0.6;
  group.add(innerFlame);

  group.userData.flameOuter = outerFlame;
  group.userData.flameInner = innerFlame;

  return group;
}
