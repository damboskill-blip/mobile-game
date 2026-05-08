import * as THREE from 'three';

const rawMat = new THREE.MeshLambertMaterial({ color: 0xc04a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });

export function createMeatMesh(type) {
  const mat = type === 'cooked' ? cookedMat : rawMat;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.2, 0.5),
    mat
  );
  mesh.castShadow = true;
  return mesh;
}
