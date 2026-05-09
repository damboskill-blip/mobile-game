import { BALANCE, nextHireCost } from '../balance.js';

function applyEffect(world, pad) {
  if (pad.type === 'hire-cook') {
    world.employees.push({
      id: ++world.nextId, type: 'cook',
      pos: { x: world.fire.pos.x, z: world.fire.pos.z },
      rot: 0, state: 'idle', target: null, carrying: false,
    });
  } else if (pad.type === 'hire-cashier') {
    // Cashiers stand at register, slightly offset so multiple don't overlap
    const i = world.employees.filter(e => e.type === 'cashier').length;
    const offset = 0.6 + i * 0.5;
    world.employees.push({
      id: ++world.nextId, type: 'cashier',
      pos: { x: world.register.pos.x + offset, z: world.register.pos.z + 0.6 },
      rot: 0, state: 'idle',
    });
  } else if (pad.type === 'hire-porter') {
    world.employees.push({
      id: ++world.nextId, type: 'porter',
      pos: { x: world.fire.pos.x + 1, z: world.fire.pos.z + 1 },
      rot: 0, state: 'idle', target: null,
      stack: { raw: 0, max: BALANCE.worker.porterStackMax },
    });
  } else if (pad.type === 'hire-repairman') {
    world.employees.push({
      id: ++world.nextId, type: 'repairman',
      pos: { x: 0, z: 0 },
      rot: 0, state: 'idle', target: null,
    });
  } else if (pad.type === 'hire-tanner') {
    world.employees.push({
      id: ++world.nextId, type: 'tanner',
      pos: { x: world.tannery.pos.x + 1, z: world.tannery.pos.z + 1 },
      rot: 0, state: 'idle', target: null,
      stack: { pelt: 0, max: BALANCE.worker.tannerStackMax },
    });
  } else if (pad.type === 'build-tower') {
    if (pad.level === 0) {
      // Build new tower L1
      world.towers.push({
        id: ++world.nextId,
        pos: { x: pad.pos.x, z: pad.pos.z },
        slot: pad.slot,
        level: 1,
        fireCooldown: 0,
        target: null,
      });
      pad.level = 1;
    } else if (pad.level < 3) {
      // Upgrade existing tower
      const tower = world.towers.find(t => t.slot === pad.slot);
      if (tower) {
        tower.level += 1;
        pad.level = tower.level;
      }
    }
  }
}

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;
  for (const pad of world.upgradePads) {
    const d = Math.hypot(pad.pos.x - p.pos.x, pad.pos.z - p.pos.z);
    if (d > BALANCE.pads.zoneRadius) continue;
    if (world.money.pocket <= 0) continue;
    if (pad.cost === Infinity) continue;

    const remaining = pad.cost - pad.deposited;
    const spend = Math.min(BALANCE.pads.depositRate * dt, world.money.pocket, remaining);
    pad.deposited += spend;
    world.money.pocket -= spend;

    if (pad.deposited >= pad.cost - 1e-6) {
      applyEffect(world, pad);
      pad.hireCount++;
      pad.deposited = 0;
      if (pad.type === 'build-tower' && pad.level >= 3) {
        pad.cost = Infinity;
      } else {
        pad.cost = nextHireCost(pad.baseCost, pad.hireCount);
      }
    }
  }
}
