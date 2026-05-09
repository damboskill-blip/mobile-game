import { BALANCE } from '../balance.js';

export function update(world, dt) {
  if (!world.fire.pos) return;
  // Tick each cooking piece's timer; on completion, spawn cooked on ground in arc around fire.
  for (let i = world.fire.cooking.length - 1; i >= 0; i--) {
    const piece = world.fire.cooking[i];
    piece.timer -= dt;
    if (piece.timer <= 0) {
      world.fire.cooking.splice(i, 1);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.4; // 0.7..1.1 from fire centre
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
