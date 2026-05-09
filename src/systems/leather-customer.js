import { BALANCE } from '../balance.js';

const ENTER_THRESHOLD = 0.3;
const LEAVE_THRESHOLD = 0.5;

function moveToward(c, targetX, targetZ, dt, speed = 3.5) {
  const dx = targetX - c.pos.x;
  const dz = targetZ - c.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = speed * dt;
  if (step >= dist) {
    c.pos.x = targetX; c.pos.z = targetZ;
    return 0;
  }
  c.pos.x += (dx / dist) * step;
  c.pos.z += (dz / dist) * step;
  c.rot = Math.atan2(dx, dz);
  return dist - step;
}

function queueSlotPos(world, queueIndex) {
  return {
    x: world.leatherCounter.pos.x + BALANCE.customer.queueOffset * (queueIndex + 1),
    z: world.leatherCounter.pos.z,
  };
}

export function spawnPremiumCustomer(world) {
  const angle = Math.random() * Math.PI * 2;
  const r = BALANCE.customer.premiumSpawnRingRadius;
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
  world.premiumCustomers.push(c);
  return c;
}

export function update(world, dt) {
  world.premiumCustomerSpawnTimer -= dt;
  if (world.premiumCustomerSpawnTimer <= 0) {
    world.premiumCustomerSpawnTimer = BALANCE.customer.premiumSpawnInterval;
    const queueAlive = world.premiumCustomers.filter(c => c.state !== 'leaving').length;
    if (queueAlive < BALANCE.customer.queueMax) {
      spawnPremiumCustomer(world);
    }
  }

  const inQueue = world.premiumCustomers.filter(c => c.state === 'entering' || c.state === 'queuing');

  for (let i = world.premiumCustomers.length - 1; i >= 0; i--) {
    const c = world.premiumCustomers[i];
    if (c.state === 'entering') {
      const queueIndex = inQueue.indexOf(c);
      const slot = queueSlotPos(world, queueIndex);
      moveToward(c, slot.x, slot.z, dt);
      const distToSlot = Math.hypot(c.pos.x - slot.x, c.pos.z - slot.z);
      if (distToSlot <= ENTER_THRESHOLD) c.state = 'queuing';
    } else if (c.state === 'queuing') {
      const queueIndex = inQueue.indexOf(c);
      const slot = queueSlotPos(world, queueIndex);
      moveToward(c, slot.x, slot.z, dt);
      if (queueIndex === 0 && world.leatherCounter.counterStack > 0) {
        c.state = 'buying';
        c.buyTimer = BALANCE.customer.buyDuration;
      }
    } else if (c.state === 'buying') {
      c.buyTimer -= dt;
      if (c.buyTimer <= 0) {
        if (world.leatherCounter.counterStack > 0) {
          world.leatherCounter.counterStack--;
          world.leatherCounter.moneyPiles.push({
            id: ++world.nextId,
            pos: {
              x: world.leatherCounter.pos.x - 0.8 + (Math.random() - 0.5) * 0.6,
              z: world.leatherCounter.pos.z - 0.8 + (Math.random() - 0.5) * 0.6,
            },
            amount: BALANCE.customer.premiumPricePerLeather,
          });
        }
        c.state = 'leaving';
      }
    } else if (c.state === 'leaving') {
      const cx = c.pos.x === 0 && c.pos.z === 0 ? 1 : c.pos.x;
      const cz = c.pos.z;
      const len = Math.hypot(cx, cz);
      const exitX = (cx / len) * BALANCE.customer.premiumSpawnRingRadius;
      const exitZ = (cz / len) * BALANCE.customer.premiumSpawnRingRadius;
      moveToward(c, exitX, exitZ, dt);
      const distToExit = Math.hypot(c.pos.x - exitX, c.pos.z - exitZ);
      if (distToExit <= LEAVE_THRESHOLD) {
        world.premiumCustomers.splice(i, 1);
      }
    }
  }
}
