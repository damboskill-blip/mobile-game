import * as THREE from 'three';
import { getWoodTexture } from './textures.js';
import { createInstance, enableShadows } from '../assets.js';

// 16 segments around base of radius 12 → chord = 24·sin(π/16) ≈ 4.68 units.
// Scale each fence segment so its x-axis span matches this chord (plus a
// small overlap so they butt together without gaps).
const FENCE_TARGET_WIDTH = 4.95;

// Procedural fallback constants
const LOG_COUNT = 12;
const LOG_HEIGHT = 1.4;
const LOG_RADIUS = 0.18;
const LOG_SPACING = 0.42;

function makeWoodMat() {
  const woodTex = getWoodTexture();
  woodTex.repeat.set(1, 2);
  return new THREE.MeshLambertMaterial({ map: woodTex, color: 0xddc8a8 });
}

const woodMat = makeWoodMat();

export function createFenceSegmentMesh() {
  const group = new THREE.Group();

  const inst = createInstance('fence');
  if (inst) {
    enableShadows(inst.scene);
    // Compute model bounding box; scale uniformly so x-extent matches target.
    const box = new THREE.Box3().setFromObject(inst.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const widthAxis = Math.max(size.x, size.z, 0.001);
    const scale = FENCE_TARGET_WIDTH / widthAxis;
    inst.scene.scale.setScalar(scale);
    group.add(inst.scene);
  } else {
    group.add(createProceduralFence());
  }

  return group;
}

export function applyFenceSegmentTransform(mesh, segment) {
  // Position: segment.pos {x, z}; rotation Y: segment.rot - π/2 so logs are tangent to the circle
  mesh.position.set(segment.pos.x, 0, segment.pos.z);
  mesh.rotation.y = -segment.rot - Math.PI / 2;
  // If broken, drop the segment to lie on the ground (rotate 90° on +X)
  if (segment.broken) {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0; // already at ground; the rotation lays logs flat
  } else {
    mesh.rotation.x = 0;
    mesh.position.y = 0;
  }
}

function createProceduralFence() {
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
