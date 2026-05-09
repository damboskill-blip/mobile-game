import * as THREE from 'three';

const counterMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });
const STACK_PIECE_HEIGHT = 0.18;

const meatGeom = new THREE.BoxGeometry(0.4, STACK_PIECE_HEIGHT, 0.55);

export function createRegisterMesh() {
  const group = new THREE.Group();

  // Counter base — wide flat box
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 1.0),
    counterMat
  );
  counter.position.y = 0.4;
  counter.castShadow = true;
  counter.receiveShadow = true;
  group.add(counter);

  // Cash register on top — small dark box
  const cashBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
  );
  cashBox.position.set(-0.4, 0.95, 0);
  cashBox.castShadow = true;
  group.add(cashBox);

  // A stack-group child for cooked meat shown on the counter top
  const cookedStack = new THREE.Group();
  cookedStack.position.set(0.2, 0.8, 0);
  group.add(cookedStack);
  group.userData.cookedStack = cookedStack;

  return group;
}

export function syncRegisterStack(group, counterStack) {
  const stack = group.userData.cookedStack;
  while (stack.children.length > counterStack) stack.children.pop();
  while (stack.children.length < counterStack) {
    const piece = new THREE.Mesh(meatGeom, cookedMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, i * STACK_PIECE_HEIGHT, 0);
  }
}
