import { killBear } from '../world.js';
import { BALANCE } from '../balance.js';

function dropStack(world) {
  const p = world.player;
  if (p.stack.count <= 0 || p.stack.type === null) return;
  const arr = p.stack.type === 'raw' ? world.meatRaw : world.meatCooked;
  for (let i = 0; i < p.stack.count; i++) {
    const angle = (i / p.stack.count) * Math.PI * 2;
    const r = 0.5;
    const piece = {
      id: ++world.nextId,
      pos: { x: p.pos.x + Math.cos(angle) * r, z: p.pos.z + Math.sin(angle) * r },
      despawnTimer: BALANCE.meat.despawn,
    };
    arr.push(piece);
  }
  p.stack.count = 0;
  p.stack.type = null;
}

export function update(world, dt) {
  const p = world.player;

  // Death detection
  if (p.state === 'alive' && p.hp <= 0) {
    p.state = 'dead';
    p.respawnTimer = BALANCE.player.respawn;
    dropStack(world);
    return;
  }

  // Respawn countdown
  if (p.state === 'dead') {
    p.respawnTimer -= dt;
    if (p.respawnTimer <= 0) {
      p.state = 'alive';
      p.hp = p.hpMax;
      p.pos.x = world.base.center.x;
      p.pos.y = 0;
      p.pos.z = world.base.center.z;
      p.respawnTimer = 0;
    }
    return;
  }

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

  // HP regen — only while alive (the dead/respawn branch already returned early above)
  if (p.hp < p.hpMax) {
    p.hp = Math.min(p.hpMax, p.hp + BALANCE.player.regenRate * dt);
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
