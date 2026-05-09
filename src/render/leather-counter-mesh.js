import * as THREE from 'three';
const counterMat = new THREE.MeshLambertMaterial({ color: 0x6a4a3a });
const leatherMat = new THREE.MeshLambertMaterial({ color: 0xd4a878 });
const STACK_PIECE_HEIGHT = 0.18;
const meatGeom = new THREE.BoxGeometry(0.4, STACK_PIECE_HEIGHT, 0.55);
export function createLeatherCounterMesh() {
  const group = new THREE.Group();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 1.0),
    counterMat
  );
  counter.position.y = 0.4;
  counter.castShadow = true;
  group.add(counter);
  // Sign or marker — golden top to mark premium
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xffd700 })
  );
  sign.position.set(-0.4, 0.95, 0);
  sign.castShadow = true;
  group.add(sign);
  // Leather stack on top
  const leatherStack = new THREE.Group();
  leatherStack.position.set(0.2, 0.8, 0);
  group.add(leatherStack);
  group.userData.leatherStack = leatherStack;
  return group;
}
export function syncLeatherCounterStack(group, count) {
  const stack = group.userData.leatherStack;
  while (stack.children.length > count) stack.children.pop();
  while (stack.children.length < count) {
    const piece = new THREE.Mesh(meatGeom, leatherMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, i * STACK_PIECE_HEIGHT, 0);
  }
}
