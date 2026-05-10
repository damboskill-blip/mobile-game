import { BALANCE } from '../balance.js';

function fireSupervised(world) {
  const r = BALANCE.fire.superviseRadius;
  const fp = world.fire.pos;
  if (world.player.state === 'alive') {
    const d = Math.hypot(world.player.pos.x - fp.x, world.player.pos.z - fp.z);
    if (d <= r) return true;
  }
  for (const e of world.employees) {
    if (e.type !== 'cook') continue;
    const d = Math.hypot(e.pos.x - fp.x, e.pos.z - fp.z);
    if (d <= r) return true;
  }
  return false;
}

export function update(world, dt) {
  if (!world.fire.pos) return;

  // Always promote queue → cooking up to capacity
  while (world.fire.cooking.length < world.fire.capacity && world.fire.queue.length > 0) {
    const piece = world.fire.queue.shift();
    world.fire.cooking.push({ id: piece.id, timer: BALANCE.fire.cookTimer });
  }

  // Tick timers only if supervised
  if (!fireSupervised(world)) return;

  for (let i = world.fire.cooking.length - 1; i >= 0; i--) {
    const piece = world.fire.cooking[i];
    piece.timer -= dt;
    if (piece.timer <= 0) {
      world.fire.cooking.splice(i, 1);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.4;
      world.meatCooked.push({
        id: ++world.nextId,
        pos: {
          x: world.fire.pos.x + Math.cos(angle) * r,
          z: world.fire.pos.z + Math.sin(angle) * r,
        },
        despawnTimer: BALANCE.meat.despawn,
      });
    }
  }
}
