import { BALANCE } from '../balance.js';
import { repairAllSegments } from './fence.js';

function applyEffect(world, pad) {
  if (pad.type === 'repair-fence') {
    repairAllSegments(world);
  } else if (pad.type === 'hire-cook') {
    world.employees.push({
      id: ++world.nextId,
      type: 'cook',
      pos: { x: world.fire.pos.x, z: world.fire.pos.z },
      rot: 0,
      state: 'idle',
      target: null,
      carrying: false,
    });
  } else if (pad.type === 'hire-cashier') {
    world.employees.push({
      id: ++world.nextId,
      type: 'cashier',
      pos: { x: world.register.pos.x + 0.6, z: world.register.pos.z + 0.6 },
      rot: 0,
      state: 'idle',
    });
  }
}

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;
  for (const pad of world.upgradePads) {
    if (pad.completed && !pad.multiUse) continue;
    const d = Math.hypot(pad.pos.x - p.pos.x, pad.pos.z - p.pos.z);
    if (d > BALANCE.pads.zoneRadius) continue;
    if (world.money.pocket <= 0) continue;

    const remaining = pad.cost - pad.deposited;
    const maxThisFrame = Math.min(BALANCE.pads.depositRate * dt, world.money.pocket, remaining);
    pad.deposited += maxThisFrame;
    world.money.pocket -= maxThisFrame;

    if (pad.deposited >= pad.cost - 1e-6) {
      applyEffect(world, pad);
      pad.deposited = 0;
      if (!pad.multiUse) {
        pad.completed = true;
      }
    }
  }
}
