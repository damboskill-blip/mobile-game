import { BALANCE } from '../balance.js';

function tannerySupervised(world) {
  const r = BALANCE.tannery.superviseRadius;
  const tp = world.tannery.pos;
  if (world.player.state === 'alive') {
    const d = Math.hypot(world.player.pos.x - tp.x, world.player.pos.z - tp.z);
    if (d <= r) return true;
  }
  for (const e of world.employees) {
    if (e.type !== 'tanner') continue;
    const d = Math.hypot(e.pos.x - tp.x, e.pos.z - tp.z);
    if (d <= r) return true;
  }
  return false;
}

export function update(world, dt) {
  if (!world.tannery.pos) return;

  while (world.tannery.processing.length < world.tannery.capacity && world.tannery.queue.length > 0) {
    const piece = world.tannery.queue.shift();
    world.tannery.processing.push({ id: piece.id, timer: BALANCE.tannery.tanTime });
  }

  if (!tannerySupervised(world)) return;

  for (let i = world.tannery.processing.length - 1; i >= 0; i--) {
    const piece = world.tannery.processing[i];
    piece.timer -= dt;
    if (piece.timer <= 0) {
      world.tannery.processing.splice(i, 1);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.4;
      world.leather.push({
        id: ++world.nextId,
        pos: {
          x: world.tannery.pos.x + Math.cos(angle) * r,
          z: world.tannery.pos.z + Math.sin(angle) * r,
        },
        despawnTimer: BALANCE.meat.despawn,
      });
    }
  }
}
