import * as THREE from 'three';

export function createPlayerMesh() {
  const group = new THREE.Group();

  // Body: capsule (cylinder + 2 spheres top/bottom — three.js capsule is fine in r0.160+)
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Head: sphere
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8c8a0 })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  // Arms: two cylinders on the sides of the body
  const limbMat = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
  const armGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.55, 6);
  for (const x of [-0.42, 0.42]) {
    const arm = new THREE.Mesh(armGeom, limbMat);
    arm.position.set(x, 0.95, 0);
    arm.castShadow = true;
    group.add(arm);
  }

  // Legs: two cylinders below body
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x4a3a26 });
  const legGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 6);
  for (const x of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(legGeom, pantsMat);
    leg.position.set(x, 0.25, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Axe — visible cue that player has weapon, even at foundation phase
  const axeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b3f1d })
  );
  axeHandle.position.set(0.5, 0.9, 0.05);
  axeHandle.rotation.z = Math.PI / 4;
  axeHandle.castShadow = true;
  group.add(axeHandle);

  const axeHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.18, 0.04),
    new THREE.MeshLambertMaterial({ color: 0x9a9a9a })
  );
  axeHead.position.set(0.74, 1.16, 0.05);
  axeHead.castShadow = true;
  group.add(axeHead);

  return group;
}
