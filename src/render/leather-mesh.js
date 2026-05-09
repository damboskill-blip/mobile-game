import * as THREE from 'three';
const leatherMat = new THREE.MeshLambertMaterial({ color: 0xd4a878 });
export function createLeatherMesh() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.55), leatherMat);
  m.castShadow = true;
  return m;
}
