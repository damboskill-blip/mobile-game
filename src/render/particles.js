import * as THREE from 'three';

const sparks = [];        // pool of active spark groups
const SPARK_LIFETIME = 0.4;
const SPARKS_PER_BURST = 8;

export function spawnHitSparks(scene, pos, color = 0xff3a1a) {
  const group = new THREE.Group();
  group.position.set(pos.x, 0.6, pos.z);
  const geom = new THREE.SphereGeometry(0.07, 4, 3);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const particles = [];
  for (let i = 0; i < SPARKS_PER_BURST; i++) {
    const s = new THREE.Mesh(geom, mat.clone());
    const angle = (i / SPARKS_PER_BURST) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 1.5;
    s.userData.vx = Math.cos(angle) * speed;
    s.userData.vy = 0.5 + Math.random() * 1.5;
    s.userData.vz = Math.sin(angle) * speed;
    s.userData.life = SPARK_LIFETIME;
    group.add(s);
    particles.push(s);
  }
  group.userData.particles = particles;
  group.userData.life = SPARK_LIFETIME;
  scene.add(group);
  sparks.push(group);
  return group;
}

export function spawnMoneyPop(scene, pos) {
  spawnHitSparks(scene, pos, 0xffd154);
}

export function updateParticles(scene, dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const group = sparks[i];
    group.userData.life -= dt;
    for (const p of group.userData.particles) {
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 4 * dt;  // gravity
      const t = group.userData.life / SPARK_LIFETIME;
      p.material.opacity = Math.max(0, t);
    }
    if (group.userData.life <= 0) {
      scene.remove(group);
      sparks.splice(i, 1);
    }
  }
}
