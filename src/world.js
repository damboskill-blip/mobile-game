import { BALANCE } from './balance.js';

export function createWorld() {
  return {
    time: { elapsed: 0, dt: 0, frameCount: 0 },
    base: { center: { x: 0, z: 0 }, radius: BALANCE.base.radius },
    player: {
      pos: { x: 0, y: 0, z: 0 },
      rot: 0,
      hp: BALANCE.player.hpMax,
      hpMax: BALANCE.player.hpMax,
      state: 'alive',
      respawnTimer: 0,
      speed: BALANCE.player.speed,
      axe: { ...BALANCE.player.axe, cooldownTimer: 0 },
      stack: { type: null, count: 0, max: BALANCE.player.stack.max },
      input: { move: { x: 0, z: 0 } },
    },
    bears: [],
    fence: { segments: createFenceSegments() },
    meatRaw: [],
    meatCooked: [],
    fire: { pos: null, cooking: [], capacity: BALANCE.fire.capacity },
    register: { pos: null, counterStack: 0, moneyPiles: [] },
    customers: [],
    money: { pocket: 0 },
    upgradePads: [],
    employees: [],
    nextId: 0,
  };
}

function createFenceSegments() {
  const segments = [];
  const r = BALANCE.base.radius;
  const n = BALANCE.fence.segments;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    segments.push({
      id: i,
      pos: { x: Math.cos(angle) * r, z: Math.sin(angle) * r },
      rot: angle,
      hp: BALANCE.fence.hpPerSegment,
      broken: false,
    });
  }
  return segments;
}
