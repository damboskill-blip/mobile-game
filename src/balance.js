export const BALANCE_VERSION = 1;

export const BALANCE = {
  base: {
    radius: 12,
  },
  player: {
    speed: 5,
    hpMax: 100,
    respawn: 2,
    pickupRadius: 1.0,
    regenRate: 10,
    stack: { max: 10 },
    axe: { range: 1.8, damage: 35, cooldown: 0.4 },
  },
  bear: {
    hpBase: 70,
    speed: 2.5,
    damageFenceBase: 10,
    damagePlayer: 25,
    attackCD: 1.0,
    attackRange: 1.5,
    meatDrops: 3,
  },
  fence: {
    segments: 16,
    hpPerSegment: 100,
    attackRange: 1.5,
  },
  fire: {
    capacity: 5,
    cookTimer: 2.0,
  },
  meat: {
    despawn: 60,
  },
  customer: {
    spawnInterval: 3.0,
    buyDuration: 1.0,
    pricePerPiece: 5,
    queueSoftMin: 2,
    queueMax: 5,
  },
  pads: {
    repairFenceCost: 200,
    hireCookCost: 500,
    hireCashierCost: 800,
    depositRate: 50,
  },
};

// Difficulty scaling — m = elapsed minutes
export function bearSpawnPeriod(m) {
  return Math.max(1.0, Math.min(4.0, 4.0 - 0.3 * m));
}

export function bearHp(m) {
  return BALANCE.bear.hpBase + 5 * m;
}

export function bearDamageFence(m) {
  return Math.max(10, Math.min(20, BALANCE.bear.damageFenceBase + 1 * m));
}
