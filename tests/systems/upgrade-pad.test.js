import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updatePad } from '../../src/systems/upgrade-pad.js';
import { BALANCE, nextHireCost } from '../../src/balance.js';

function cookPad(w) { return w.upgradePads.find(p => p.type === 'hire-cook'); }
function cashierPad(w) { return w.upgradePads.find(p => p.type === 'hire-cashier'); }
function porterPad(w) { return w.upgradePads.find(p => p.type === 'hire-porter'); }
function repairmanPad(w) { return w.upgradePads.find(p => p.type === 'hire-repairman'); }

describe('upgrade pad deposit', () => {
  it('deposits at depositRate per second while player on pad with money', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 0.5);
    const expected = BALANCE.pads.depositRate * 0.5; // 50
    expect(w.money.pocket).toBeCloseTo(100 - expected, 5);
    expect(pad.deposited).toBeCloseTo(expected, 5);
  });

  it('does not deposit when player not on pad', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x + 5, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 1.0);
    expect(w.money.pocket).toBe(100);
    expect(pad.deposited).toBe(0);
  });

  it('does not deposit when player has no money', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 0;
    updatePad(w, 1.0);
    expect(pad.deposited).toBe(0);
  });

  it('caps deposit at cost and resets on hire completion', () => {
    const w = createWorld();
    const pad = cookPad(w);
    const baseCost = pad.cost;
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 9999;
    updatePad(w, 100); // way more than needed
    // After completion deposited resets to 0
    expect(pad.deposited).toBe(0);
    // hireCount increments
    expect(pad.hireCount).toBe(1);
    // cost is now scaled by hireMultiplier
    expect(pad.cost).toBeCloseTo(nextHireCost(baseCost, 1), 0);
    // money spent is baseCost (one hire)
    expect(w.money.pocket).toBeCloseTo(9999 - baseCost, 5);
  });
});

describe('upgrade pad effect on completion', () => {
  it('hire-cook spawns a cook employee; hireCount increments; cost scales up', () => {
    const w = createWorld();
    const pad = cookPad(w);
    const baseCost = pad.baseCost;
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cook')).toHaveLength(1);
    expect(pad.hireCount).toBe(1);
    expect(pad.deposited).toBe(0);
    // Next cost should be baseCost * 1.7
    expect(pad.cost).toBeCloseTo(Math.round(baseCost * BALANCE.pads.hireMultiplier), 0);
  });

  it('hire-cook can be hired multiple times; each hire increases cost', () => {
    const w = createWorld();
    const pad = cookPad(w);
    const baseCost = pad.baseCost;

    // First hire
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 99999;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cook')).toHaveLength(1);
    expect(pad.hireCount).toBe(1);
    const costAfterFirst = pad.cost;
    expect(costAfterFirst).toBeCloseTo(nextHireCost(baseCost, 1), 0);

    // Second hire
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cook')).toHaveLength(2);
    expect(pad.hireCount).toBe(2);
    expect(pad.cost).toBeCloseTo(nextHireCost(baseCost, 2), 0);
  });

  it('hire-cashier spawns a cashier; hireCount increments', () => {
    const w = createWorld();
    const pad = cashierPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cashier')).toHaveLength(1);
    expect(pad.hireCount).toBe(1);
  });

  it('hire-porter spawns a porter with stack; hireCount increments; cost scales', () => {
    const w = createWorld();
    const pad = porterPad(w);
    const baseCost = pad.baseCost;
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    const porters = w.employees.filter(e => e.type === 'porter');
    expect(porters).toHaveLength(1);
    expect(porters[0].stack).toBeDefined();
    expect(porters[0].stack.max).toBe(BALANCE.worker.porterStackMax);
    expect(pad.hireCount).toBe(1);
    expect(pad.cost).toBeCloseTo(Math.round(baseCost * BALANCE.pads.hireMultiplier), 0);
  });

  it('hire-repairman spawns a repairman; hireCount increments; cost scales', () => {
    const w = createWorld();
    const pad = repairmanPad(w);
    const baseCost = pad.baseCost;
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    const repairmen = w.employees.filter(e => e.type === 'repairman');
    expect(repairmen).toHaveLength(1);
    expect(pad.hireCount).toBe(1);
    expect(pad.cost).toBeCloseTo(Math.round(baseCost * BALANCE.pads.hireMultiplier), 0);
  });

  it('no repair-fence pad exists', () => {
    const w = createWorld();
    expect(w.upgradePads.find(p => p.type === 'repair-fence')).toBeUndefined();
  });

  it('pad never sets completed field', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 99999;
    updatePad(w, 100);
    expect(pad.completed).toBeUndefined();
  });
});

describe('nextHireCost helper', () => {
  it('returns baseCost when hireCount is 0', () => {
    expect(nextHireCost(300, 0)).toBe(300);
  });

  it('scales by hireMultiplier each time', () => {
    expect(nextHireCost(300, 1)).toBe(Math.round(300 * 1.7));
    expect(nextHireCost(300, 2)).toBe(Math.round(300 * 1.7 * 1.7));
  });
});

describe('build-tower pad', () => {
  function towerPad(w, slot = 0) {
    return w.upgradePads.find(p => p.type === 'build-tower' && p.slot === slot);
  }

  it('first deposit on build-tower pad creates tower at slot with level 1', () => {
    const w = createWorld();
    const pad = towerPad(w, 0);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.towers).toHaveLength(1);
    expect(w.towers[0].level).toBe(1);
    expect(w.towers[0].slot).toBe(0);
    expect(pad.level).toBe(1);
  });

  it('second deposit upgrades tower to level 2', () => {
    const w = createWorld();
    const pad = towerPad(w, 0);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 99999;
    // First: build L1
    updatePad(w, 100);
    expect(pad.level).toBe(1);
    // Second: upgrade to L2
    updatePad(w, 100);
    expect(pad.level).toBe(2);
    expect(w.towers[0].level).toBe(2);
  });

  it('third deposit upgrades tower to level 3', () => {
    const w = createWorld();
    const pad = towerPad(w, 0);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 99999;
    updatePad(w, 100); // L1
    updatePad(w, 100); // L2
    updatePad(w, 100); // L3
    expect(pad.level).toBe(3);
    expect(w.towers[0].level).toBe(3);
    expect(pad.cost).toBe(Infinity);
  });

  it('fourth deposit does nothing (cost is Infinity)', () => {
    const w = createWorld();
    const pad = towerPad(w, 0);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 99999;
    updatePad(w, 100); // L1
    updatePad(w, 100); // L2
    updatePad(w, 100); // L3
    const moneyAfterThree = w.money.pocket;
    updatePad(w, 100); // should do nothing
    expect(w.money.pocket).toBe(moneyAfterThree);
    expect(w.towers).toHaveLength(1);
    expect(w.towers[0].level).toBe(3);
  });

  it('cost progression: $1200 → $2040 → $3468 → Infinity', () => {
    const w = createWorld();
    const pad = towerPad(w, 0);
    expect(pad.cost).toBe(1200);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 99999;
    updatePad(w, 100); // L1 built; cost becomes nextHireCost(1200, 1)
    // hireCount = 1, cost = round(1200 * 1.7^1) = 2040
    expect(pad.cost).toBeCloseTo(Math.round(1200 * 1.7), 0);
    updatePad(w, 100); // L2; cost becomes nextHireCost(1200, 2)
    // hireCount = 2, cost = round(1200 * 1.7^2) = 3468
    expect(pad.cost).toBeCloseTo(Math.round(1200 * 1.7 * 1.7), 0);
    updatePad(w, 100); // L3; cost becomes Infinity
    expect(pad.cost).toBe(Infinity);
  });

  it('each slot builds an independent tower', () => {
    const w = createWorld();
    for (let slot = 0; slot < 4; slot++) {
      const pad = towerPad(w, slot);
      w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
      w.money.pocket = 99999;
      updatePad(w, 100);
    }
    expect(w.towers).toHaveLength(4);
    const slots = w.towers.map(t => t.slot).sort((a, b) => a - b);
    expect(slots).toEqual([0, 1, 2, 3]);
  });
});
