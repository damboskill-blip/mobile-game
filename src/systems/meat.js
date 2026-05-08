import { BALANCE } from '../balance.js';

export function update(world, dt) {
  // Despawn timer + auto-pickup for raw meat
  for (let i = world.meatRaw.length - 1; i >= 0; i--) {
    const piece = world.meatRaw[i];
    piece.despawnTimer -= dt;
    if (piece.despawnTimer <= 0) {
      world.meatRaw.splice(i, 1);
      continue;
    }
    if (tryPickup(world, piece, 'raw')) {
      world.meatRaw.splice(i, 1);
    }
  }
  // Despawn + auto-pickup for cooked meat (cooked logic added in Phase 3)
  for (let i = world.meatCooked.length - 1; i >= 0; i--) {
    const piece = world.meatCooked[i];
    piece.despawnTimer -= dt;
    if (piece.despawnTimer <= 0) {
      world.meatCooked.splice(i, 1);
      continue;
    }
    if (tryPickup(world, piece, 'cooked')) {
      world.meatCooked.splice(i, 1);
    }
  }
}

function tryPickup(world, piece, type) {
  const p = world.player;
  if (p.state !== 'alive') return false;
  const d = Math.hypot(piece.pos.x - p.pos.x, piece.pos.z - p.pos.z);
  if (d > BALANCE.player.pickupRadius) return false;
  if (p.stack.count >= p.stack.max) return false;
  if (p.stack.type !== null && p.stack.type !== type) return false;
  p.stack.type = type;
  p.stack.count++;
  return true;
}
