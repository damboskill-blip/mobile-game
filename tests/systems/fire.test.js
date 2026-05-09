import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateFire } from '../../src/systems/fire.js';
import { BALANCE } from '../../src/balance.js';

describe('fire cooking', () => {
  it('cookTimer ticks down for each piece in cooking[]', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: BALANCE.fire.cookTimer });
    const before = w.fire.cooking[0].timer;
    updateFire(w, 0.5);
    expect(w.fire.cooking[0].timer).toBeCloseTo(before - 0.5, 5);
  });

  it('removes piece from cooking and spawns cooked on ground when timer reaches 0', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    expect(w.fire.cooking).toHaveLength(0);
    expect(w.meatCooked).toHaveLength(1);
  });

  it('cooked spawn position is near fire pos within ~1 unit', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    const cooked = w.meatCooked[0];
    const dist = Math.hypot(cooked.pos.x - w.fire.pos.x, cooked.pos.z - w.fire.pos.z);
    expect(dist).toBeLessThanOrEqual(1.2);
    expect(dist).toBeGreaterThan(0.3);
  });

  it('processes multiple pieces in same frame', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    expect(w.meatCooked).toHaveLength(2);
    expect(w.fire.cooking).toHaveLength(0);
  });

  it('does nothing when cooking[] is empty', () => {
    const w = createWorld();
    expect(() => updateFire(w, 0.016)).not.toThrow();
  });
});
