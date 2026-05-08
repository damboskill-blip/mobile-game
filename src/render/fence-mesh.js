import * as THREE from 'three';

const LOG_COUNT = 4;     // logs per segment
const LOG_HEIGHT = 1.4;
const LOG_RADIUS = 0.18;
const LOG_SPACING = 0.42;
const SEGMENT_ARC_LENGTH = 4.7; // approximately the chord at radius 12 / 16 segments

const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b3f1d });

export function createFenceSegmentMesh() {
  const group = new THREE.Group();
  for (let i = 0; i < LOG_COUNT; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, LOG_HEIGHT, 6),
      woodMat
    );
    log.position.set((i - (LOG_COUNT - 1) / 2) * LOG_SPACING, LOG_HEIGHT / 2, 0);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
  }
  return group;
}

export function applyFenceSegmentTransform(mesh, segment) {
  // Position: segment.pos {x, z}; rotation Y: segment.rot - π/2 so logs are tangent to the circle
  mesh.position.set(segment.pos.x, 0, segment.pos.z);
  mesh.rotation.y = segment.rot - Math.PI / 2;
  // If broken, drop the segment to lie on the ground (rotate 90° on +X)
  if (segment.broken) {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0; // already at ground; the rotation lays logs flat
  } else {
    mesh.rotation.x = 0;
    mesh.position.y = 0;
  }
}
