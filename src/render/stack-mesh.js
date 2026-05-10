import * as THREE from 'three';

const rawMat = new THREE.MeshLambertMaterial({ color: 0xc04a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });
const peltMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
const leatherMat = new THREE.MeshLambertMaterial({ color: 0xd4a878 });
const STACK_PIECE_HEIGHT = 0.18;
const STACK_BASE_Y = 1.0;
const meatGeom = new THREE.BoxGeometry(0.32, STACK_PIECE_HEIGHT, 0.45);

export function createStackGroups() {
  const raw = new THREE.Group();
  raw.position.set(-0.05, 0, -0.20);
  const cooked = new THREE.Group();
  cooked.position.set(-0.05, 0, -0.55);
  const pelt = new THREE.Group();
  pelt.position.set(0.30, 0, -0.20);
  const leather = new THREE.Group();
  leather.position.set(0.30, 0, -0.55);
  return { raw, cooked, pelt, leather };
}

function syncOneStack(group, count, mat) {
  while (group.children.length > count) group.children.pop();
  while (group.children.length < count) {
    const piece = new THREE.Mesh(meatGeom, mat);
    piece.castShadow = true;
    group.add(piece);
  }
  for (let i = 0; i < group.children.length; i++) {
    group.children[i].position.set(0, STACK_BASE_Y + i * STACK_PIECE_HEIGHT, 0);
  }
}

export function syncStackMesh(groups, stack) {
  syncOneStack(groups.raw, stack.raw, rawMat);
  syncOneStack(groups.cooked, stack.cooked, cookedMat);
  syncOneStack(groups.pelt, stack.pelt, peltMat);
  syncOneStack(groups.leather, stack.leather, leatherMat);
}
