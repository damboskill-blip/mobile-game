import * as THREE from 'three';

const PARTICLES_PER_EMITTER = 16;
const SMOKE_LIFETIME = 2.0;
const RISE_SPEED = 1.2;

export function createSmokeEmitter() {
  const group = new THREE.Group();
  const geom = new THREE.SphereGeometry(0.18, 6, 5);
  const mat = new THREE.MeshLambertMaterial({
    color: 0x8a8a8a,
    transparent: true,
    opacity: 0.4,
  });
  const particles = [];
  for (let i = 0; i < PARTICLES_PER_EMITTER; i++) {
    const m = new THREE.Mesh(geom, mat.clone());
    m.userData.life = Math.random() * SMOKE_LIFETIME;
    m.userData.spawnX = (Math.random() - 0.5) * 0.4;
    m.userData.spawnZ = (Math.random() - 0.5) * 0.4;
    m.userData.driftX = (Math.random() - 0.5) * 0.3;
    m.userData.driftZ = (Math.random() - 0.5) * 0.3;
    group.add(m);
    particles.push(m);
  }
  group.userData.particles = particles;
  return group;
}

export function updateSmoke(group, dt) {
  for (const m of group.userData.particles) {
    m.userData.life -= dt;
    if (m.userData.life <= 0) {
      m.userData.life = SMOKE_LIFETIME;
      m.position.set(m.userData.spawnX, 0.5, m.userData.spawnZ);
      m.scale.setScalar(0.7 + Math.random() * 0.3);
      m.material.opacity = 0.5;
    } else {
      m.position.y += RISE_SPEED * dt;
      m.position.x += m.userData.driftX * dt;
      m.position.z += m.userData.driftZ * dt;
      const t = m.userData.life / SMOKE_LIFETIME;
      m.material.opacity = 0.5 * t;
      m.scale.multiplyScalar(1 + dt * 0.3);
    }
  }
}
