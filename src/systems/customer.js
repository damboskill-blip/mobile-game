import { BALANCE } from '../balance.js';
import { currentBuyDuration } from './employee.js';

const ENTER_THRESHOLD = 0.3;
const LEAVE_THRESHOLD = 0.5;

function moveToward(c, targetX, targetZ, dt, speed = 3.5) {
  const dx = targetX - c.pos.x;
  const dz = targetZ - c.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = speed * dt;
  if (step >= dist) {
    c.pos.x = targetX;
    c.pos.z = targetZ;
    return 0;
  }
  c.pos.x += (dx / dist) * step;
  c.pos.z += (dz / dist) * step;
  c.rot = Math.atan2(dx, dz);
  return dist - step;
}

function queueSlotPos(world, queueIndex) {
  // Slots arrayed in front of register (offset along +X from register)
  // Index 0 is at the register itself; further customers queue behind
  return {
    x: world.register.pos.x + BALANCE.customer.queueOffset * queueIndex,
    z: world.register.pos.z,
  };
}

export function spawnCustomer(world) {
  const angle = Math.random() * Math.PI * 2;
  const r = BALANCE.customer.spawnRingRadius;
  // Spawn point and remembered exit point
  const sx = Math.cos(angle) * r;
  const sz = Math.sin(angle) * r;
  const c = {
    id: ++world.nextId,
    pos: { x: sx, z: sz },
    rot: 0,
    state: 'entering',
    buyTimer: 0,
    spawnAngle: angle,
  };
  world.customers.push(c);
  return c;
}

export function update(world, dt) {
  // Spawn timer
  world.customerSpawnTimer -= dt;
  if (world.customerSpawnTimer <= 0) {
    world.customerSpawnTimer = BALANCE.customer.spawnInterval;
    const queueAlive = world.customers.filter(c => c.state !== 'leaving').length;
    const shouldSpawn =
      queueAlive < BALANCE.customer.queueMax &&
      world.register.counterStack > 0;
    if (shouldSpawn) spawnCustomer(world);
  }

  // Build queue index lookup: only for customers in 'entering' or 'queuing'
  const inQueue = world.customers.filter(c => c.state === 'entering' || c.state === 'queuing');

  // Iterate in reverse for safe removal during iteration
  for (let i = world.customers.length - 1; i >= 0; i--) {
    const c = world.customers[i];
    if (c.state === 'entering') {
      const queueIndex = inQueue.indexOf(c);
      const slot = queueSlotPos(world, queueIndex);
      moveToward(c, slot.x, slot.z, dt);
      const distToSlot = Math.hypot(c.pos.x - slot.x, c.pos.z - slot.z);
      if (distToSlot <= ENTER_THRESHOLD) c.state = 'queuing';
    } else if (c.state === 'queuing') {
      const queueIndex = inQueue.indexOf(c);
      const slot = queueSlotPos(world, queueIndex);
      // Move forward in line as the queue advances
      moveToward(c, slot.x, slot.z, dt);
      // Front of queue + stock available → buy
      if (queueIndex === 0 && world.register.counterStack > 0) {
        c.state = 'buying';
        c.buyTimer = currentBuyDuration(world);
      }
    } else if (c.state === 'buying') {
      c.buyTimer -= dt;
      if (c.buyTimer <= 0) {
        if (world.register.counterStack > 0) {
          world.register.counterStack--;
          // Drop money pile near register on player-side (offset toward +X away from queue)
          world.register.moneyPiles.push({
            id: ++world.nextId,
            pos: {
              x: world.register.pos.x - 0.8 + (Math.random() - 0.5) * 0.6,
              z: world.register.pos.z - 0.8 + (Math.random() - 0.5) * 0.6,
            },
            amount: BALANCE.customer.pricePerPiece,
          });
        }
        c.state = 'leaving';
      }
    } else if (c.state === 'leaving') {
      // Walk radially outward from the map center until past spawnRingRadius
      const distFromCenter = Math.hypot(c.pos.x, c.pos.z);
      if (distFromCenter >= BALANCE.customer.spawnRingRadius - LEAVE_THRESHOLD) {
        world.customers.splice(i, 1);
      } else {
        // Move radially outward
        const angle = distFromCenter < 0.001 ? c.spawnAngle : Math.atan2(c.pos.z, c.pos.x);
        const exitX = Math.cos(angle) * BALANCE.customer.spawnRingRadius;
        const exitZ = Math.sin(angle) * BALANCE.customer.spawnRingRadius;
        moveToward(c, exitX, exitZ, dt);
      }
    }
  }
}
