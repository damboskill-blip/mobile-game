import * as THREE from 'three';

const billMat = new THREE.MeshLambertMaterial({ color: 0x5ec85a });

export function createMoneyMesh() {
  const group = new THREE.Group();
  // A small fan of bills lying flat
  for (let i = 0; i < 3; i++) {
    const bill = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.22),
      billMat
    );
    bill.position.y = 0.04 + i * 0.045;
    bill.rotation.y = (i - 1) * 0.2;
    bill.castShadow = true;
    group.add(bill);
  }
  return group;
}
