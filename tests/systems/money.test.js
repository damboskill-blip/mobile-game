import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateMoney } from '../../src/systems/money.js';
import { BALANCE } from '../../src/balance.js';

function dropPile(w, x, z, amount = 5) {
  const p = { id: ++w.nextId, pos: { x, z }, amount };
  w.register.moneyPiles.push(p);
  return p;
}

describe('money pickup', () => {
  it('player picks up money pile within pickupRadius', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropPile(w, 0.3, 0, 7);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(0);
    expect(w.money.pocket).toBe(7);
  });

  it('does not pick up money outside pickupRadius', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropPile(w, 5, 0, 7);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(1);
    expect(w.money.pocket).toBe(0);
  });

  it('does not pick up when player is dead', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.state = 'dead';
    dropPile(w, 0.3, 0, 7);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(1);
    expect(w.money.pocket).toBe(0);
  });

  it('picks up multiple piles in same frame', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropPile(w, 0.3, 0.1, 5);
    dropPile(w, -0.3, -0.1, 3);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(0);
    expect(w.money.pocket).toBe(8);
  });
});
