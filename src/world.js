import { BALANCE, BALANCE_VERSION } from './balance.js';

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
    fire: { pos: { x: 3, z: -3 }, cooking: [], capacity: BALANCE.fire.capacity },
    register: { pos: null, counterStack: 0, moneyPiles: [] },
    customers: [],
    money: { pocket: 0 },
    upgradePads: [],
    employees: [],
    nextId: 0,
    playerDamageCD: 0,
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

export const SAVE_KEY = 'bmt:save:v1';

export function saveWorld(world, storage = globalThis.localStorage) {
  if (!storage) return;
  const payload = {
    version: BALANCE_VERSION,
    money: { pocket: world.money.pocket },
    fence: {
      segments: world.fence.segments.map(s => ({
        id: s.id, hp: s.hp, broken: s.broken,
      })),
    },
    time: { elapsed: world.time.elapsed },
    upgradePads: world.upgradePads.map(p => ({
      id: p.id, type: p.type, deposited: p.deposited, completed: p.completed,
    })),
    employees: world.employees.map(e => ({ id: e.id, type: e.type })),
  };
  storage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function loadWorld(world, storage = globalThis.localStorage) {
  if (!storage) return;
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return;
  let saved;
  try { saved = JSON.parse(raw); } catch { return; }
  if (saved.version !== BALANCE_VERSION) return;

  if (saved.money) world.money.pocket = saved.money.pocket ?? 0;
  if (saved.time) world.time.elapsed = saved.time.elapsed ?? 0;
  // Fence state intentionally not restored here. The save format keeps it for
  // forward-compat, but until the Phase 5 repair-fence pad exists, restoring a
  // broken fence would leave players with no way to recover. Re-enable when the
  // repair pad ships.
  // if (saved.fence?.segments) { ... restore hp/broken ... }
  // upgradePads / employees restored in later phases when those systems exist
}

export function spawnBear(world, pos) {
  const bear = {
    id: ++world.nextId,
    pos: { x: pos.x, z: pos.z },
    rot: 0,
    hp: BALANCE.bear.hpBase,
    hpMax: BALANCE.bear.hpBase,
    speed: BALANCE.bear.speed,
    state: 'approaching',
    target: null,
    attackCD: 0,
  };
  world.bears.push(bear);
  return bear;
}

export function dropMeatRaw(world, pos) {
  const piece = {
    id: ++world.nextId,
    pos: { x: pos.x, z: pos.z },
    despawnTimer: BALANCE.meat.despawn,
  };
  world.meatRaw.push(piece);
  return piece;
}

export function killBear(world, bear) {
  const idx = world.bears.indexOf(bear);
  if (idx >= 0) world.bears.splice(idx, 1);
  for (let i = 0; i < BALANCE.bear.meatDrops; i++) {
    const angle = (i / BALANCE.bear.meatDrops) * Math.PI * 2;
    const r = 0.6;
    dropMeatRaw(world, {
      x: bear.pos.x + Math.cos(angle) * r,
      z: bear.pos.z + Math.sin(angle) * r,
    });
  }
}
