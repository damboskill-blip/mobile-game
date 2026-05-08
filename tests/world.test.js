import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world.js';

describe('createWorld', () => {
  it('returns world with required top-level shape', () => {
    const w = createWorld();
    expect(w.time).toEqual({ elapsed: 0, dt: 0, frameCount: 0 });
    expect(w.base).toEqual({ center: { x: 0, z: 0 }, radius: 12 });
    expect(w.money).toEqual({ pocket: 0 });
    expect(w.nextId).toBe(0);
  });

  it('player starts at base center with full HP', () => {
    const w = createWorld();
    expect(w.player.pos).toEqual({ x: 0, y: 0, z: 0 });
    expect(w.player.rot).toBe(0);
    expect(w.player.hp).toBe(100);
    expect(w.player.hpMax).toBe(100);
    expect(w.player.state).toBe('alive');
    expect(w.player.respawnTimer).toBe(0);
    expect(w.player.stack).toEqual({ type: null, count: 0, max: 10 });
    expect(w.player.input).toEqual({ move: { x: 0, z: 0 } });
  });

  it('initializes empty entity arrays', () => {
    const w = createWorld();
    expect(w.bears).toEqual([]);
    expect(w.meatRaw).toEqual([]);
    expect(w.meatCooked).toEqual([]);
    expect(w.customers).toEqual([]);
    expect(w.employees).toEqual([]);
  });

  it('fence has 16 segments equally spaced', () => {
    const w = createWorld();
    expect(w.fence.segments).toHaveLength(16);
    for (const seg of w.fence.segments) {
      expect(seg.hp).toBe(100);
      expect(seg.broken).toBe(false);
    }
  });
});
