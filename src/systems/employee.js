import { BALANCE } from '../balance.js';

const COOK_SPEED = 4.0;
const COOK_PICKUP_RADIUS = 0.6;
const COOK_DROPOFF_RADIUS = 1.2;

const PORTER_PICKUP_RADIUS = 0.8;
const REPAIRMAN_REACH = 1.2;

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

function findMostDamagedSegment(world) {
  let worst = null;
  let worstHp = Infinity;
  for (const seg of world.fence.segments) {
    if (seg.hp < BALANCE.fence.hpPerSegment && seg.hp < worstHp) {
      worst = seg;
      worstHp = seg.hp;
    }
  }
  return worst;
}

function handlePorter(world, emp, dt) {
  if (emp.state === 'idle') {
    // Decide: keep collecting, or head to fire if stack full / no more raw
    if (emp.stack.raw >= emp.stack.max) {
      emp.state = 'going-to-fire';
      return;
    }
    // Find nearest raw
    let nearest = null, nd = Infinity;
    for (const piece of world.meatRaw) {
      const d = Math.hypot(piece.pos.x - emp.pos.x, piece.pos.z - emp.pos.z);
      if (d < nd) { nearest = piece; nd = d; }
    }
    if (nearest) {
      emp.target = nearest.id;
      emp.state = 'going-to-meat';
    } else if (emp.stack.raw > 0) {
      // No more raw to collect, deliver what we have
      emp.state = 'going-to-fire';
    }
    // else: no raw, no carry, idle
  } else if (emp.state === 'going-to-meat') {
    const piece = world.meatRaw.find(p => p.id === emp.target);
    if (!piece) {
      emp.state = 'idle';
      emp.target = null;
      return;
    }
    moveToward(emp, piece.pos.x, piece.pos.z, dt, BALANCE.worker.porterSpeed);
    const d = Math.hypot(emp.pos.x - piece.pos.x, emp.pos.z - piece.pos.z);
    if (d <= PORTER_PICKUP_RADIUS) {
      const idx = world.meatRaw.indexOf(piece);
      if (idx >= 0) world.meatRaw.splice(idx, 1);
      emp.stack.raw++;
      emp.target = null;
      emp.state = 'idle';
    }
  } else if (emp.state === 'going-to-fire') {
    moveToward(emp, world.fire.pos.x, world.fire.pos.z, dt, BALANCE.worker.porterSpeed);
    const d = Math.hypot(emp.pos.x - world.fire.pos.x, emp.pos.z - world.fire.pos.z);
    if (d <= BALANCE.fire.transferRange) {
      // Dump as much as fits
      const slotsFree = world.fire.capacity - world.fire.cooking.length;
      const toTransfer = Math.min(slotsFree, emp.stack.raw);
      for (let i = 0; i < toTransfer; i++) {
        world.fire.cooking.push({ id: ++world.nextId, timer: BALANCE.fire.cookTimer });
      }
      emp.stack.raw -= toTransfer;
      emp.state = 'idle';
    }
  }
}

function handleRepairman(world, emp, dt) {
  if (emp.state === 'idle') {
    const target = findMostDamagedSegment(world);
    if (target) {
      emp.target = target.id;
      emp.state = 'going-to-fence';
    }
  } else if (emp.state === 'going-to-fence') {
    const seg = world.fence.segments.find(s => s.id === emp.target);
    if (!seg || seg.hp >= BALANCE.fence.hpPerSegment) {
      emp.state = 'idle';
      emp.target = null;
      return;
    }
    moveToward(emp, seg.pos.x, seg.pos.z, dt, BALANCE.worker.repairmanSpeed);
    const d = Math.hypot(emp.pos.x - seg.pos.x, emp.pos.z - seg.pos.z);
    if (d <= REPAIRMAN_REACH) {
      emp.state = 'repairing';
    }
  } else if (emp.state === 'repairing') {
    const seg = world.fence.segments.find(s => s.id === emp.target);
    if (!seg) { emp.state = 'idle'; emp.target = null; return; }
    seg.hp = Math.min(BALANCE.fence.hpPerSegment, seg.hp + BALANCE.worker.repairmanRate * dt);
    if (seg.hp >= BALANCE.fence.hpPerSegment) {
      seg.broken = false;
      emp.target = null;
      emp.state = 'idle';
    }
  }
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
    if (emp.type === 'cook') {
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
    } else if (emp.type === 'porter') {
      handlePorter(world, emp, dt);
    } else if (emp.type === 'repairman') {
      handleRepairman(world, emp, dt);
    }
    // cashier has no AI
  }
}
