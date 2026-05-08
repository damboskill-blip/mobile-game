import { describe, it, expect } from 'vitest';
import { createWorld, saveWorld, loadWorld, SAVE_KEY } from '../src/world.js';
import { BALANCE, BALANCE_VERSION } from '../src/balance.js';

describe('createWorld', () => {
  it('returns world with required top-level shape', () => {
    const w = createWorld();
    expect(w.time).toEqual({ elapsed: 0, dt: 0, frameCount: 0 });
    expect(w.base).toEqual({ center: { x: 0, z: 0 }, radius: BALANCE.base.radius });
    expect(w.money).toEqual({ pocket: 0 });
    expect(w.nextId).toBe(0);
  });

  it('player starts at base center with full HP', () => {
    const w = createWorld();
    expect(w.player.pos).toEqual({ x: 0, y: 0, z: 0 });
    expect(w.player.rot).toBe(0);
    expect(w.player.hp).toBe(BALANCE.player.hpMax);
    expect(w.player.hpMax).toBe(BALANCE.player.hpMax);
    expect(w.player.state).toBe('alive');
    expect(w.player.respawnTimer).toBe(0);
    expect(w.player.stack).toEqual({ type: null, count: 0, max: BALANCE.player.stack.max });
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
    expect(w.fence.segments).toHaveLength(BALANCE.fence.segments);
    for (const seg of w.fence.segments) {
      expect(seg.hp).toBe(BALANCE.fence.hpPerSegment);
      expect(seg.broken).toBe(false);
    }
  });
});

// Mock localStorage for node environment
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

describe('save/load', () => {
  it('SAVE_KEY is versioned', () => {
    expect(SAVE_KEY).toBe('bmt:save:v1');
  });

  it('saveWorld persists only the saved-fields whitelist', () => {
    const storage = new MockStorage();
    const w = createWorld();
    w.money.pocket = 1234;
    w.fence.segments[0].hp = 50;
    w.fence.segments[1].broken = true;
    w.time.elapsed = 99;
    w.bears.push({ id: 5, pos: { x: 1, z: 2 }, hp: 70 }); // ephemeral, must NOT save

    saveWorld(w, storage);
    const raw = storage.getItem('bmt:save:v1');
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(BALANCE_VERSION);
    expect(parsed.money.pocket).toBe(1234);
    expect(parsed.fence.segments[0].hp).toBe(50);
    expect(parsed.fence.segments[1].broken).toBe(true);
    expect(parsed.time.elapsed).toBe(99);
    expect(parsed.bears).toBeUndefined();
    expect(parsed.player).toBeUndefined();
  });

  it('loadWorld restores saved fields onto a fresh world', () => {
    const storage = new MockStorage();
    storage.setItem('bmt:save:v1', JSON.stringify({
      version: BALANCE_VERSION,
      money: { pocket: 500 },
      fence: { segments: Array(16).fill(0).map((_, i) => ({ id: i, hp: 75, broken: false })) },
      time: { elapsed: 42 },
      upgradePads: [],
      employees: [],
    }));

    const w = createWorld();
    loadWorld(w, storage);
    expect(w.money.pocket).toBe(500);
    expect(w.time.elapsed).toBe(42);
    expect(w.fence.segments[0].hp).toBe(75);
    // ephemeral state is untouched
    expect(w.player.hp).toBe(BALANCE.player.hpMax);
    expect(w.bears).toEqual([]);
  });

  it('loadWorld no-ops when no save exists', () => {
    const storage = new MockStorage();
    const w = createWorld();
    loadWorld(w, storage);
    expect(w.money.pocket).toBe(0);
  });

  it('loadWorld no-ops when version mismatches', () => {
    const storage = new MockStorage();
    storage.setItem('bmt:save:v1', JSON.stringify({ version: 999, money: { pocket: 9999 } }));
    const w = createWorld();
    loadWorld(w, storage);
    expect(w.money.pocket).toBe(0);
  });
});
