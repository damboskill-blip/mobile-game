import { describe, it, expect } from 'vitest';
import { createWorld, dropMeatRaw } from '../../src/world.js';
import { update as updateMeat } from '../../src/systems/meat.js';
import { BALANCE } from '../../src/balance.js';

describe('meat despawn', () => {
  it('despawn timer ticks down', () => {
    const w = createWorld();
    const piece = dropMeatRaw(w, { x: 5, z: 5 });
    const before = piece.despawnTimer;
    updateMeat(w, 1.0);
    expect(piece.despawnTimer).toBe(before - 1.0);
  });

  it('removed from world when despawn timer reaches 0', () => {
    const w = createWorld();
    dropMeatRaw(w, { x: 5, z: 5 });
    expect(w.meatRaw).toHaveLength(1);
    updateMeat(w, BALANCE.meat.despawn + 1);
    expect(w.meatRaw).toHaveLength(0);
  });
});

describe('meat pickup', () => {
  it('player picks up raw meat within pickupRadius into empty stack', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropMeatRaw(w, { x: 0.3, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(0);
    expect(w.player.stack.raw).toBe(1);
    expect(w.player.stack.cooked).toBe(0);
  });

  it('does not pick up meat outside pickupRadius', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropMeatRaw(w, { x: 5, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(1);
    expect(w.player.stack.raw).toBe(0);
  });

  it('player can carry both raw and cooked simultaneously, no upper limit', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    // Drop 50 raw and 50 cooked all near player; pickup should accept all
    for (let i = 0; i < 50; i++) {
      dropMeatRaw(w, { x: 0.3, z: 0 });
    }
    for (let i = 0; i < 50; i++) {
      w.meatCooked.push({ id: ++w.nextId, pos: { x: 0.3, z: 0 }, despawnTimer: 60 });
    }
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(0);
    expect(w.meatCooked).toHaveLength(0);
    expect(w.player.stack.raw).toBe(50);
    expect(w.player.stack.cooked).toBe(50);
  });

  it('does not pick up when player is dead', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.state = 'dead';
    dropMeatRaw(w, { x: 0.3, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(1);
  });
});
