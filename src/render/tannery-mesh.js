import * as THREE from 'three';
import { getWoodTexture } from './textures.js';
const woodMat = new THREE.MeshLambertMaterial({ map: getWoodTexture() });
const leatherStretchMat = new THREE.MeshLambertMaterial({ color: 0xa87848 });
export function createTanneryMesh() {
  const group = new THREE.Group();
  // Wooden base/work surface
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.6, 1.2),
    woodMat
  );
  base.position.y = 0.3;
  base.castShadow = true;
  group.add(base);
  // Stretched leather/hide on top
  const stretched = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.05, 1.0),
    leatherStretchMat
  );
  stretched.position.y = 0.65;
  group.add(stretched);
  // Side beams
  for (const x of [-0.7, 0.7]) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6),
      woodMat
    );
    beam.position.set(x, 1.15, 0);
    beam.castShadow = true;
    group.add(beam);
  }
  return group;
}
