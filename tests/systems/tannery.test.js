import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateTannery } from '../../src/systems/tannery.js';
import { BALANCE } from '../../src/balance.js';

describe('tannery processing', () => {
  it('tanTime ticks down for each piece in processing[]', () => {
    const w = createWorld();
    w.tannery.processing.push({ id: ++w.nextId, timer: BALANCE.tannery.tanTime });
    const before = w.tannery.processing[0].timer;
    updateTannery(w, 0.5);
    expect(w.tannery.processing[0].timer).toBeCloseTo(before - 0.5, 5);
  });

  it('removes piece from processing and spawns leather on ground when timer reaches 0', () => {
    const w = createWorld();
    w.tannery.processing.push({ id: ++w.nextId, timer: 0.05 });
    updateTannery(w, 0.1);
    expect(w.tannery.processing).toHaveLength(0);
    expect(w.leather).toHaveLength(1);
  });

  it('leather spawn position is near tannery pos within ~1.2 units', () => {
    const w = createWorld();
    w.tannery.processing.push({ id: ++w.nextId, timer: 0.05 });
    updateTannery(w, 0.1);
    const leather = w.leather[0];
    const dist = Math.hypot(
      leather.pos.x - w.tannery.pos.x,
      leather.pos.z - w.tannery.pos.z
    );
    expect(dist).toBeLessThanOrEqual(1.2);
    expect(dist).toBeGreaterThan(0.3);
  });

  it('processes multiple pieces in same frame', () => {
    const w = createWorld();
    w.tannery.processing.push({ id: ++w.nextId, timer: 0.05 });
    w.tannery.processing.push({ id: ++w.nextId, timer: 0.05 });
    updateTannery(w, 0.1);
    expect(w.leather).toHaveLength(2);
    expect(w.tannery.processing).toHaveLength(0);
  });

  it('does nothing when processing[] is empty', () => {
    const w = createWorld();
    expect(() => updateTannery(w, 0.016)).not.toThrow();
    expect(w.leather).toHaveLength(0);
  });
});
