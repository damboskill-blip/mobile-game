import * as THREE from 'three';

// Pool of clothing colors for visual variety
const SHIRTS = [0x4a78c8, 0xc8a878, 0x8a6a3a, 0x4a8a6a, 0xa86890, 0xc06848];

export function createCustomerMesh() {
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
