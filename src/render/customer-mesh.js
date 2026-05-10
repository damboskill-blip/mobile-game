import * as THREE from 'three';
import { createInstance, enableShadows } from '../assets.js';

// Pool of clothing colors for visual variety (used in procedural fallback)
const SHIRTS = [0x4a78c8, 0xc8a878, 0x8a6a3a, 0x4a8a6a, 0xa86890, 0xc06848];
const PREMIUM_SHIRTS = [0xffd700, 0x8a4ac8, 0xc8324a, 0x4ac890];

export function createCustomerMesh() {
  const variant = Math.random() < 0.5 ? 'customerA' : 'customerB';
  const inst = createInstance(variant);
  if (inst) {
    const group = new THREE.Group();
    enableShadows(inst.scene);
    inst.scene.scale.setScalar(1.0);
    inst.scene.rotation.y = Math.PI;
    group.add(inst.scene);
    return group;
  }
  return createProceduralCustomer();
}

export function createPremiumCustomerMesh() {
  const inst = createInstance('premiumCustomer');
  if (inst) {
    const group = new THREE.Group();
    enableShadows(inst.scene);
    inst.scene.scale.setScalar(1.0);
    inst.scene.rotation.y = Math.PI;
    group.add(inst.scene);
    return group;
  }
  return createProceduralPremiumCustomer();
}

function createProceduralCustomer() {
  const group = new THREE.Group();
  const shirtColor = SHIRTS[Math.floor(Math.random() * SHIRTS.length)];

  // Body
  const bodyMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), bodyMat);
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8c8a0 })
  );
  head.position.y = 1.4;
  head.castShadow = true;
  group.add(head);

  return group;
}

function createProceduralPremiumCustomer() {
  const group = new THREE.Group();
  const shirt = PREMIUM_SHIRTS[Math.floor(Math.random() * PREMIUM_SHIRTS.length)];
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8),
    new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 0.7; body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8c8a0 }));
  head.position.y = 1.4; head.castShadow = true;
  group.add(head);
  // Hat to differentiate visually
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a2a4a }));
  hat.position.y = 1.7; hat.castShadow = true;
  group.add(hat);
  return group;
}
