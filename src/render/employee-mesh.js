import * as THREE from 'three';

const cookShirtMat = new THREE.MeshLambertMaterial({ color: 0xeae0d4 });   // chef whites
const cookHatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const cashierShirtMat = new THREE.MeshLambertMaterial({ color: 0x3a3aa0 }); // navy
const PORTER_SHIRT = 0xff8800;
const REPAIRMAN_SHIRT = 0x4a78c8;
const headMat = new THREE.MeshLambertMaterial({ color: 0xe8c8a0 });

export function createEmployeeMesh(type) {
  const group = new THREE.Group();

  let shirtMat;
  if (type === 'cook') {
    shirtMat = cookShirtMat;
  } else if (type === 'cashier') {
    shirtMat = cashierShirtMat;
  } else if (type === 'porter') {
    shirtMat = new THREE.MeshLambertMaterial({ color: PORTER_SHIRT });
  } else {
    shirtMat = new THREE.MeshLambertMaterial({ color: REPAIRMAN_SHIRT });
  }

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

  // Porter gets a backpack
  if (type === 'porter') {
    const backpack = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.25),
      new THREE.MeshLambertMaterial({ color: 0x6b3014 })
    );
    backpack.position.set(0, 0.85, -0.28);
    backpack.castShadow = true;
    group.add(backpack);
  }

  // Repairman gets a tool belt
  if (type === 'repairman') {
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.12, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x4a4a4a })
    );
    belt.position.y = 0.6;
    group.add(belt);
  }

  return group;
}
