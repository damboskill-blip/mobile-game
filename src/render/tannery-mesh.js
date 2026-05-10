import * as THREE from 'three';
import { getWoodTexture } from './textures.js';
const woodMat = new THREE.MeshLambertMaterial({ map: getWoodTexture() });
const leatherStretchMat = new THREE.MeshLambertMaterial({ color: 0xa87848 });
const peltQueueMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
const QUEUE_PIECE_H = 0.16;
const queuePieceGeom = new THREE.BoxGeometry(0.32, QUEUE_PIECE_H, 0.45);

export function createTanneryMesh() {
  const group = new THREE.Group();
  // Wooden base/work surface
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.6, 1.2),
    woodMat
  );
  base.position.y = 0.3;
  base.castShadow = true;
  group.add(base);
  // Stretched leather/hide on top
  const stretched = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.05, 1.0),
    leatherStretchMat
  );
  stretched.position.y = 0.65;
  group.add(stretched);
  // Side beams
  for (const x of [-0.7, 0.7]) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6),
      woodMat
    );
    beam.position.set(x, 1.15, 0);
    beam.castShadow = true;
    group.add(beam);
  }

  // Queue stack: pelt boxes stacked beside the tannery
  const queueStack = new THREE.Group();
  queueStack.position.set(0.8, 0, 0);
  group.add(queueStack);
  group.userData.queueStack = queueStack;

  return group;
}

export function syncTanneryQueueStack(group, count) {
  const stack = group.userData.queueStack;
  if (!stack) return;
  const display = Math.min(count, 12);
  while (stack.children.length > display) stack.children.pop();
  while (stack.children.length < display) {
    const piece = new THREE.Mesh(queuePieceGeom, peltQueueMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, 0.1 + i * QUEUE_PIECE_H, 0);
  }
}
