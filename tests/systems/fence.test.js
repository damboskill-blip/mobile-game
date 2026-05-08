import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateFence, damageFenceSegment, repairAllSegments } from '../../src/systems/fence.js';

describe('fence damage', () => {
  it('damageFenceSegment subtracts hp', () => {
    const w = createWorld();
    const segId = w.fence.segments[0].id;
    damageFenceSegment(w, segId, 30);
    expect(w.fence.segments[0].hp).toBe(70);
  });

  it('hp clamps at 0 and segment becomes broken', () => {
    const w = createWorld();
    const segId = w.fence.segments[0].id;
    damageFenceSegment(w, segId, 999);
    expect(w.fence.segments[0].hp).toBe(0);
    expect(w.fence.segments[0].broken).toBe(true);
  });

  it('damaging a broken segment is a no-op', () => {
    const w = createWorld();
    w.fence.segments[0].hp = 0;
    w.fence.segments[0].broken = true;
    damageFenceSegment(w, w.fence.segments[0].id, 50);
    expect(w.fence.segments[0].hp).toBe(0);
  });

  it('repairAllSegments restores hp and clears broken flag', () => {
    const w = createWorld();
    w.fence.segments[0].hp = 0;
    w.fence.segments[0].broken = true;
    w.fence.segments[3].hp = 25;
    repairAllSegments(w);
    for (const s of w.fence.segments) {
      expect(s.hp).toBe(100);
      expect(s.broken).toBe(false);
    }
  });

  it('update is a pure call that does not throw on empty fence', () => {
    const w = createWorld();
    expect(() => updateFence(w, 0.016)).not.toThrow();
  });
});
