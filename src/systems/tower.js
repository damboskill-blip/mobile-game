import { BALANCE } from '../balance.js';
import { killBear } from '../world.js';

export function update(world, dt) {
  for (const tower of world.towers) {
    const stats = BALANCE.tower.levels[tower.level - 1];

    // Decrement fire cooldown
    tower.fireCooldown -= dt;

    // Validate target: clear if bear no longer exists or out of range
    if (tower.target !== null) {
      const targetBear = world.bears.find(b => b.id === tower.target);
      if (!targetBear) {
        tower.target = null;
      } else {
        const dist = Math.hypot(targetBear.pos.x - tower.pos.x, targetBear.pos.z - tower.pos.z);
        if (dist > stats.range) {
          tower.target = null;
        }
      }
    }

    // Acquire new target if none
    if (tower.target === null) {
      let nearest = null;
      let nearestDist = Infinity;
      for (const bear of world.bears) {
        const dist = Math.hypot(bear.pos.x - tower.pos.x, bear.pos.z - tower.pos.z);
        if (dist <= stats.range && dist < nearestDist) {
          nearest = bear;
          nearestDist = dist;
        }
      }
      if (nearest) tower.target = nearest.id;
    }

    // Fire if target and cooldown elapsed
    if (tower.target !== null && tower.fireCooldown <= 0) {
      const targetBear = world.bears.find(b => b.id === tower.target);
      if (targetBear) {
        targetBear.hp -= stats.damage;
        if (targetBear.hp <= 0) {
          killBear(world, targetBear);
          tower.target = null;
        }
        tower.fireCooldown = stats.fireCD;
      } else {
        tower.target = null;
      }
    }
  }
}
