import * as THREE from 'three';
import { createInstance, enableShadows } from '../assets.js';

const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });
const STACK_PIECE_HEIGHT = 0.18;
const meatGeom = new THREE.BoxGeometry(0.4, STACK_PIECE_HEIGHT, 0.55);

export function createRegisterMesh() {
  const group = new THREE.Group();

  const inst = createInstance('register');
  if (inst) {
    enableShadows(inst.scene);
    inst.scene.scale.setScalar(1.5);
    group.add(inst.scene);
  } else {
    group.add(createProceduralRegister());
  }

  // Counter stack above the stand (always procedural — gameplay UI element)
  const counterStack = new THREE.Group();
  counterStack.position.set(0, 1.2, 0);
  group.add(counterStack);
  group.userData.cookedStack = counterStack;

  return group;
}

export function syncRegisterStack(group, counterStack) {
  const stack = group.userData.cookedStack;
  if (!stack) return;
  const display = Math.min(counterStack, 12);
  while (stack.children.length > display) stack.children.pop();
  while (stack.children.length < display) {
    const piece = new THREE.Mesh(meatGeom, cookedMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, i * STACK_PIECE_HEIGHT, 0);
  }
}

function createProceduralRegister() {
  const counterMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
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

  return group;
}
