import { BALANCE } from '../balance.js';
import { damageFenceSegment } from './fence.js';

export function findNearestUnbrokenSegment(world, pos) {
  let best = null;
  let bestDist = Infinity;
  for (const seg of world.fence.segments) {
    if (seg.broken) continue;
    const d = Math.hypot(seg.pos.x - pos.x, seg.pos.z - pos.z);
    if (d < bestDist) { best = seg; bestDist = d; }
  }
  return best;
}

function moveToward(bear, targetPos, dt) {
  const dx = targetPos.x - bear.pos.x;
  const dz = targetPos.z - bear.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = bear.speed * dt;
  if (step >= dist) {
    bear.pos.x = targetPos.x;
    bear.pos.z = targetPos.z;
  } else {
    bear.pos.x += (dx / dist) * step;
    bear.pos.z += (dz / dist) * step;
  }
  bear.rot = Math.atan2(dx, dz);
  return dist;
}

export function update(world, dt) {
  for (const bear of world.bears) {
    if (bear.attackCD > 0) bear.attackCD -= dt;

    if (bear.state === 'approaching') {
      // Re-pick target if missing or broken
      if (!bear.target || bear.target.broken) {
        bear.target = findNearestUnbrokenSegment(world, bear.pos);
      }
      if (!bear.target) {
        // No fence left — walk straight to player
        bear.state = 'through';
        continue;
      }
      const dist = moveToward(bear, bear.target.pos, dt);
      if (dist <= BALANCE.fence.attackRange) {
        bear.state = 'attacking-fence';
      }
    } else if (bear.state === 'attacking-fence') {
      if (!bear.target || bear.target.broken) {
        bear.state = 'through';
        bear.target = null;
        continue;
      }
      if (bear.attackCD <= 0) {
        damageFenceSegment(world, bear.target.id, BALANCE.bear.damageFenceBase);
        bear.attackCD = BALANCE.bear.attackCD;
        if (bear.target.broken) {
          bear.state = 'through';
          bear.target = null;
        }
      }
    } else if (bear.state === 'through') {
      const dist = moveToward(bear, world.player.pos, dt);
      if (dist <= BALANCE.bear.attackRange) {
        bear.state = 'attacking-player';
      }
    } else if (bear.state === 'attacking-player') {
      // Player damage handled in Task 9. For now, hold position.
      // If player moves out of range, return to chasing.
      const dist = Math.hypot(world.player.pos.x - bear.pos.x, world.player.pos.z - bear.pos.z);
      if (dist > BALANCE.bear.attackRange + 0.5) {
        bear.state = 'through';
      }
    }
  }
}
