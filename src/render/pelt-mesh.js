import * as THREE from 'three';
const peltMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
export function createPeltMesh() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.6), peltMat);
  m.castShadow = true;
  return m;
}
