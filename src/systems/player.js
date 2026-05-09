import { killBear } from '../world.js';
import { BALANCE } from '../balance.js';

function tryTransferStackToFire(world) {
  const p = world.player;
  if (!world.fire.pos) return;
  if (p.stack.raw <= 0) return;
  const dx = world.fire.pos.x - p.pos.x;
  const dz = world.fire.pos.z - p.pos.z;
  if (Math.hypot(dx, dz) > BALANCE.fire.transferRange) return;
  const slotsFree = world.fire.capacity - world.fire.cooking.length;
  const toTransfer = Math.min(slotsFree, p.stack.raw);
  for (let i = 0; i < toTransfer; i++) {
    world.fire.cooking.push({ id: ++world.nextId, timer: BALANCE.fire.cookTimer });
  }
  p.stack.raw -= toTransfer;
}

function tryTransferStackToCounter(world) {
  const p = world.player;
  if (!world.register.pos) return;
  if (p.stack.cooked <= 0) return;
  const dx = world.register.pos.x - p.pos.x;
  const dz = world.register.pos.z - p.pos.z;
  if (Math.hypot(dx, dz) > BALANCE.register.transferRange) return;
  world.register.counterStack += p.stack.cooked;
  p.stack.cooked = 0;
}

function dropStack(world) {
  const p = world.player;
  const total = p.stack.raw + p.stack.cooked;
  if (total <= 0) return;
  let i = 0;
  function dropPiece(arr) {
    const angle = (i / total) * Math.PI * 2;
    const r = 0.5;
    arr.push({
      id: ++world.nextId,
      pos: { x: p.pos.x + Math.cos(angle) * r, z: p.pos.z + Math.sin(angle) * r },
      despawnTimer: BALANCE.meat.despawn,
    });
    i++;
  }
  for (let j = 0; j < p.stack.raw; j++) dropPiece(world.meatRaw);
  for (let j = 0; j < p.stack.cooked; j++) dropPiece(world.meatCooked);
  p.stack.raw = 0;
  p.stack.cooked = 0;
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

  // Try to deposit raw stack onto fire
  tryTransferStackToFire(world);
  tryTransferStackToCounter(world);

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
