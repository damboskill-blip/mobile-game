import * as THREE from 'three';

const dashMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.7,
});

export function createSuperviseRing(radius) {
  const group = new THREE.Group();
  const segments = 32;
  const dashGeom = new THREE.BoxGeometry(0.22, 0.02, 0.06);
  for (let i = 0; i < segments; i++) {
    if (i % 2 === 1) continue; // dash pattern
    const a = (i / segments) * Math.PI * 2;
    const dash = new THREE.Mesh(dashGeom, dashMat);
    dash.position.set(Math.cos(a) * radius, 0.03, Math.sin(a) * radius);
    dash.rotation.y = -a;
    group.add(dash);
  }
  return group;
}
