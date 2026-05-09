import * as THREE from 'three';

const cookShirtMat = new THREE.MeshLambertMaterial({ color: 0xeae0d4 });   // chef whites
const cookHatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const cashierShirtMat = new THREE.MeshLambertMaterial({ color: 0x3a3aa0 }); // navy
const headMat = new THREE.MeshLambertMaterial({ color: 0xe8c8a0 });

export function createEmployeeMesh(type) {
  const group = new THREE.Group();
  const shirtMat = type === 'cook' ? cookShirtMat : cashierShirtMat;

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.75, 4, 8), shirtMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), headMat);
  head.position.y = 1.5;
  head.castShadow = true;
  group.add(head);

  // Cook gets a chef's hat
  if (type === 'cook') {
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.18, 0.3, 12),
      cookHatMat
    );
    hat.position.y = 1.85;
    hat.castShadow = true;
    group.add(hat);
  }

  return group;
}
