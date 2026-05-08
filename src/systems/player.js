import { killBear } from '../world.js';

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;

  // Movement
  let mx = p.input.move.x;
  let mz = p.input.move.z;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (len > 0.001) {
    p.pos.x += mx * p.speed * dt;
    p.pos.z += mz * p.speed * dt;
    p.rot = Math.atan2(mx, mz);
  }

  // Auto-attack
  if (p.axe.cooldownTimer > 0) p.axe.cooldownTimer -= dt;
  if (p.axe.cooldownTimer <= 0) {
    let nearest = null;
    let nearestDist = p.axe.range;
    for (const bear of world.bears) {
      const d = Math.hypot(bear.pos.x - p.pos.x, bear.pos.z - p.pos.z);
      if (d <= nearestDist) { nearest = bear; nearestDist = d; }
    }
    if (nearest) {
      nearest.hp -= p.axe.damage;
      p.axe.cooldownTimer = p.axe.cooldown;
      if (nearest.hp <= 0) killBear(world, nearest);
    }
  }
}
