export const BALANCE_VERSION = 1;

export const BALANCE = {
  base: {
    radius: 12,
  },
  player: {
    speed: 6,
    hpMax: 130,
    respawn: 2,
    pickupRadius: 1.0,
    regenRate: 20,
    stack: { max: 10 },
    axe: { range: 1.8, damage: 35, cooldown: 0.4 },
  },
  bear: {
    hpBase: 50,
    speed: 2.5,
    damageFenceBase: 6,
    damagePlayer: 8,
    attackCD: 1.0,
    attackRange: 1.5,
    meatDrops: 3,
    spawnDistance: 3,
    maxAlive: 10,
  },
  fence: {
    segments: 16,
    hpPerSegment: 100,
    attackRange: 1.5,
  },
  fire: {
    capacity: 5,
    cookTimer: 2.0,
    transferRange: 1.5,
    superviseRadius: 3.0,
  },
  register: {
    transferRange: 1.5,
  },
  meat: {
    despawn: 60,
  },
  customer: {
    spawnInterval: 0.5,
    buyDuration: 0.35,
    pricePerPiece: 8,
    queueSoftMin: 2,
    queueMax: 8,
    queueOffset: 1.2,
    spawnRingRadius: 16,
    premiumPricePerLeather: 40,
    premiumSpawnInterval: 0.7,
    premiumSpawnRingRadius: 16,
    initialQueueRegular: 4,
    initialQueuePremium: 2,
  },
  pads: {
    repairFenceCost: 100,
    hireCookCost: 300,
    hireCashierCost: 500,
    depositRate: 100,
    zoneRadius: 0.8,
    hireMultiplier: 1.7,        // each subsequent hire of same type costs 1.7x previous
    hirePorterBaseCost: 400,
    hireRepairmanBaseCost: 300,
    buildTowerBaseCost: 1200,
    hireTannerBaseCost: 600,
  },
  tannery: {
    capacity: 5,
    tanTime: 3.5,           // longer than meat cookTimer for balance
    transferRange: 1.5,
    superviseRadius: 3.0,
  },
  leatherCounter: {
    transferRange: 1.5,
  },
  tower: {
    levels: [
      { damage: 25, range: 8, fireCD: 1.5 },
      { damage: 40, range: 9, fireCD: 1.2 },
      { damage: 60, range: 10, fireCD: 0.8 },
    ],
  },
  worker: {
    porterSpeed: 4.5,
    porterStackMax: 5,
    porterPickupRadius: 0.8,
    repairmanSpeed: 4.0,
    repairmanRate: 25,             // hp restored per second when adjacent to fence
    repairmanReachRadius: 1.2,
    tannerSpeed: 4.5,
    tannerStackMax: 5,
  },
};

// Difficulty scaling — m = elapsed minutes
export function bearSpawnPeriod(m) {
  return Math.max(1.5, Math.min(3.0, 3.0 - 0.2 * m));
}

export function bearHp(m) {
  return BALANCE.bear.hpBase + 3 * m;
}

export function bearDamageFence(m) {
  return Math.max(BALANCE.bear.damageFenceBase, Math.min(12, BALANCE.bear.damageFenceBase + 0.5 * m));
}

export function nextHireCost(baseCost, hireCount) {
  return Math.round(baseCost * Math.pow(BALANCE.pads.hireMultiplier, hireCount));
}
