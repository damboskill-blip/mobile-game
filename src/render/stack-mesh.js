import * as THREE from 'three';

const rawMat = new THREE.MeshLambertMaterial({ color: 0xc04a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });
const STACK_PIECE_HEIGHT = 0.18;
const STACK_BASE_Y = 1.0; // height on player's back where the stack starts

const meatGeom = new THREE.BoxGeometry(0.32, STACK_PIECE_HEIGHT, 0.45);

export function createStackGroup() {
  const group = new THREE.Group();
  group.position.set(-0.05, 0, -0.25); // slightly behind+left of player center
  return group;
}

export function syncStackMesh(group, stack) {
  // Remove extra children
  while (group.children.length > stack.count) {
    const m = group.children.pop();
    m.geometry?.dispose?.();
  }
  // Add missing children
  while (group.children.length < stack.count) {
    const mat = stack.type === 'cooked' ? cookedMat : rawMat;
    const piece = new THREE.Mesh(meatGeom, mat);
    piece.castShadow = true;
    group.add(piece);
  }
  // Recolour all (in case type changed) and stack vertically
  for (let i = 0; i < group.children.length; i++) {
    const piece = group.children[i];
    piece.material = stack.type === 'cooked' ? cookedMat : rawMat;
    piece.position.set(0, STACK_BASE_Y + i * STACK_PIECE_HEIGHT, 0);
  }
}
