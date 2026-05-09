import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updatePad } from '../../src/systems/upgrade-pad.js';
import { BALANCE } from '../../src/balance.js';

function repairPad(w) { return w.upgradePads.find(p => p.type === 'repair-fence'); }
function cookPad(w) { return w.upgradePads.find(p => p.type === 'hire-cook'); }
function cashierPad(w) { return w.upgradePads.find(p => p.type === 'hire-cashier'); }

describe('upgrade pad deposit', () => {
  it('deposits at depositRate per second while player on pad with money', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 0.5);
    const expected = BALANCE.pads.depositRate * 0.5; // 25
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

  it('does not deposit on a completed one-shot pad', () => {
    const w = createWorld();
    const pad = cookPad(w);
    pad.completed = true;
    pad.deposited = pad.cost;
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 1.0);
    expect(w.money.pocket).toBe(100);
    expect(pad.deposited).toBe(pad.cost); // unchanged
  });

  it('caps deposit at cost (does not over-fill)', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 9999;
    updatePad(w, 100); // way more than needed
    expect(pad.deposited).toBe(0); // reset on completion
    expect(pad.completed).toBe(true);
    expect(w.money.pocket).toBeCloseTo(9999 - pad.cost, 5);
  });
});

describe('upgrade pad effect on completion', () => {
  it('repair-fence on completion repairs all fence segments and resets deposited (multi-use)', () => {
    const w = createWorld();
    // Damage some segments
    w.fence.segments[0].hp = 10;
    w.fence.segments[1].hp = 0;
    w.fence.segments[1].broken = true;
    const pad = repairPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    for (const s of w.fence.segments) {
      expect(s.hp).toBe(BALANCE.fence.hpPerSegment);
      expect(s.broken).toBe(false);
    }
    expect(pad.completed).toBe(false); // multi-use, never sets completed
    expect(pad.deposited).toBe(0);    // reset
  });

  it('hire-cook on completion adds a cook employee and marks pad completed', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cook')).toHaveLength(1);
    expect(pad.completed).toBe(true);
  });

  it('hire-cashier on completion adds a cashier employee and marks pad completed', () => {
    const w = createWorld();
    const pad = cashierPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cashier')).toHaveLength(1);
    expect(pad.completed).toBe(true);
  });
});
