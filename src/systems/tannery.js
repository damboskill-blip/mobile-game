import { BALANCE } from '../balance.js';

export function update(world, dt) {
  if (!world.tannery.pos) return;
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
