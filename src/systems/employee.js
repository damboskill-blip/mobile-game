import { BALANCE } from '../balance.js';

const COOK_SPEED = 4.0;
const COOK_PICKUP_RADIUS = 0.6;
const COOK_DROPOFF_RADIUS = 1.2;

function moveToward(emp, targetX, targetZ, dt, speed) {
  const dx = targetX - emp.pos.x;
  const dz = targetZ - emp.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = speed * dt;
  if (step >= dist) {
    emp.pos.x = targetX;
    emp.pos.z = targetZ;
    return 0;
  }
  emp.pos.x += (dx / dist) * step;
  emp.pos.z += (dz / dist) * step;
  emp.rot = Math.atan2(dx, dz);
  return dist - step;
}

function findNearestCookedNearFire(world) {
  const fp = world.fire.pos;
  let best = null;
  let bestDist = Infinity;
  for (const piece of world.meatCooked) {
    const d = Math.hypot(piece.pos.x - fp.x, piece.pos.z - fp.z);
    if (d > 4.0) continue; // only pick up pieces close to the fire
    if (d < bestDist) { best = piece; bestDist = d; }
  }
  return best;
}

export function hasCashier(world) {
  return world.employees.some(e => e.type === 'cashier');
}

export function currentBuyDuration(world) {
  return hasCashier(world)
    ? BALANCE.customer.buyDuration / 2
    : BALANCE.customer.buyDuration;
}

export function update(world, dt) {
  for (const emp of world.employees) {
    if (emp.type !== 'cook') continue; // cashier has no AI

    if (emp.state === 'idle') {
      const piece = findNearestCookedNearFire(world);
      if (piece) {
        emp.state = 'going-to-cooked';
        emp.target = piece.id;
      }
    } else if (emp.state === 'going-to-cooked') {
      const piece = world.meatCooked.find(p => p.id === emp.target);
      if (!piece) {
        emp.state = 'idle';
        emp.target = null;
        continue;
      }
      moveToward(emp, piece.pos.x, piece.pos.z, dt, COOK_SPEED);
      const d = Math.hypot(emp.pos.x - piece.pos.x, emp.pos.z - piece.pos.z);
      if (d <= COOK_PICKUP_RADIUS) {
        const idx = world.meatCooked.indexOf(piece);
        if (idx >= 0) world.meatCooked.splice(idx, 1);
        emp.carrying = true;
        emp.target = null;
        emp.state = 'going-to-counter';
      }
    } else if (emp.state === 'going-to-counter') {
      moveToward(emp, world.register.pos.x, world.register.pos.z, dt, COOK_SPEED);
      const d = Math.hypot(emp.pos.x - world.register.pos.x, emp.pos.z - world.register.pos.z);
      if (d <= COOK_DROPOFF_RADIUS) {
        if (emp.carrying) {
          world.register.counterStack += 1;
          emp.carrying = false;
        }
        emp.state = 'idle';
      }
    }
  }
}
