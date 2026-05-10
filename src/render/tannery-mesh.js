import * as THREE from 'three';
import { getWoodTexture } from './textures.js';
import { createInstance, enableShadows } from '../assets.js';

const woodMat = new THREE.MeshLambertMaterial({ map: getWoodTexture() });
const peltQueueMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
const QUEUE_PIECE_H = 0.16;
const queuePieceGeom = new THREE.BoxGeometry(0.32, QUEUE_PIECE_H, 0.45);

export function createTanneryMesh() {
  const group = new THREE.Group();

  const inst = createInstance('tannery');
  if (inst) {
    enableShadows(inst.scene);
    inst.scene.scale.setScalar(1.5);
    group.add(inst.scene);
  } else {
    group.add(createProceduralTannery());
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

export function syncTanneryQueueStack(group, count) {
  const stack = group.userData.queueStackGroup;
  if (!stack) return;
  const display = Math.min(count, 12);
  while (stack.children.length > display) stack.children.pop();
  while (stack.children.length < display) {
    const piece = new THREE.Mesh(queuePieceGeom, peltQueueMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, i * QUEUE_PIECE_H, 0);
  }
}

function createProceduralTannery() {
  const leatherStretchMat = new THREE.MeshLambertMaterial({ color: 0xa87848 });
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

  return group;
}
