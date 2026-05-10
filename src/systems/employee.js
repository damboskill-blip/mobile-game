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
      for (let i = 0; i < emp.stack.raw; i++) {
        world.fire.queue.push({ id: ++world.nextId });
      }
      emp.stack.raw = 0;
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

function handleTanner(world, emp, dt) {
  if (emp.state === 'idle') {
    if (emp.stack.pelt >= emp.stack.max) {
      emp.state = 'going-to-tannery';
      return;
    }
    let nearest = null, nd = Infinity;
    for (const piece of world.pelts) {
      const d = Math.hypot(piece.pos.x - emp.pos.x, piece.pos.z - emp.pos.z);
      if (d < nd) { nearest = piece; nd = d; }
    }
    if (nearest) {
      emp.target = nearest.id;
      emp.state = 'going-to-pelt';
    } else if (emp.stack.pelt > 0) {
      emp.state = 'going-to-tannery';
    }
    // Return to tannery to supervise when idle and no pelt to pick up
    if (emp.state === 'idle' && emp.stack.pelt === 0) {
      const tp = world.tannery.pos;
      const dToTannery = Math.hypot(emp.pos.x - tp.x, emp.pos.z - tp.z);
      if (dToTannery > 1.5) {
        moveToward(emp, tp.x, tp.z, dt, BALANCE.worker.tannerSpeed);
      }
    }
  } else if (emp.state === 'going-to-pelt') {
    const piece = world.pelts.find(p => p.id === emp.target);
    if (!piece) { emp.state = 'idle'; emp.target = null; return; }
    moveToward(emp, piece.pos.x, piece.pos.z, dt, BALANCE.worker.tannerSpeed);
    const d = Math.hypot(emp.pos.x - piece.pos.x, emp.pos.z - piece.pos.z);
    if (d <= 0.8) {
      const idx = world.pelts.indexOf(piece);
      if (idx >= 0) world.pelts.splice(idx, 1);
      emp.stack.pelt++;
      emp.target = null;
      emp.state = 'idle';
    }
  } else if (emp.state === 'going-to-tannery') {
    moveToward(emp, world.tannery.pos.x, world.tannery.pos.z, dt, BALANCE.worker.tannerSpeed);
    const d = Math.hypot(emp.pos.x - world.tannery.pos.x, emp.pos.z - world.tannery.pos.z);
    if (d <= BALANCE.tannery.transferRange) {
      for (let i = 0; i < emp.stack.pelt; i++) {
        world.tannery.queue.push({ id: ++world.nextId });
      }
      emp.stack.pelt = 0;
      emp.state = 'idle';
    }
  }
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
        // Return to fire to supervise when idle and no cooked to pick up
        if (emp.state === 'idle') {
          const fp = world.fire.pos;
          const dToFire = Math.hypot(emp.pos.x - fp.x, emp.pos.z - fp.z);
          if (dToFire > 1.5) {
            moveToward(emp, fp.x, fp.z, dt, COOK_SPEED);
          }
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
    } else if (emp.type === 'tanner') {
      handleTanner(world, emp, dt);
    }
    // cashier has no AI
  }
}
