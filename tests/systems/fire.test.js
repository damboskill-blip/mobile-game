import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateFire } from '../../src/systems/fire.js';
import { BALANCE } from '../../src/balance.js';

// Helper: place player inside superviseRadius so cooking ticks
function superviseByPlayer(world) {
  world.player.state = 'alive';
  world.player.pos.x = world.fire.pos.x;
  world.player.pos.z = world.fire.pos.z;
}

describe('fire cooking', () => {
  it('cookTimer ticks down when player supervises', () => {
    const w = createWorld();
    superviseByPlayer(w);
    w.fire.cooking.push({ id: ++w.nextId, timer: BALANCE.fire.cookTimer });
    const before = w.fire.cooking[0].timer;
    updateFire(w, 0.5);
    expect(w.fire.cooking[0].timer).toBeCloseTo(before - 0.5, 5);
  });

  it('cookTimer does NOT tick when player is far and no cook employee', () => {
    const w = createWorld();
    // Player far from fire (default pos 0,0 and fire at 3,-3 — hypot ≈ 4.24 > superviseRadius 3.0)
    w.player.pos = { x: -10, y: 0, z: -10 };
    w.fire.cooking.push({ id: ++w.nextId, timer: BALANCE.fire.cookTimer });
    const before = w.fire.cooking[0].timer;
    updateFire(w, 0.5);
    expect(w.fire.cooking[0].timer).toBe(before);
  });

  it('removes piece from cooking and spawns cooked on ground when timer reaches 0 (supervised)', () => {
    const w = createWorld();
    superviseByPlayer(w);
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    expect(w.fire.cooking).toHaveLength(0);
    expect(w.meatCooked).toHaveLength(1);
  });

  it('cooked spawn position is near fire pos within ~1 unit', () => {
    const w = createWorld();
    superviseByPlayer(w);
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    const cooked = w.meatCooked[0];
    const dist = Math.hypot(cooked.pos.x - w.fire.pos.x, cooked.pos.z - w.fire.pos.z);
    expect(dist).toBeLessThanOrEqual(1.2);
    expect(dist).toBeGreaterThan(0.3);
  });

  it('processes multiple pieces in same frame (supervised)', () => {
    const w = createWorld();
    superviseByPlayer(w);
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

  it('promotes pieces from queue to cooking up to capacity', () => {
    const w = createWorld();
    for (let i = 0; i < 8; i++) w.fire.queue.push({ id: ++w.nextId });
    updateFire(w, 0.016);
    expect(w.fire.cooking).toHaveLength(w.fire.capacity);
    expect(w.fire.queue).toHaveLength(8 - w.fire.capacity);
  });

  it('after piece finishes cooking, next queued piece promotes on next tick', () => {
    const w = createWorld();
    superviseByPlayer(w);
    // Fill cooking to capacity
    for (let i = 0; i < w.fire.capacity; i++) {
      w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    }
    // Add one more to queue
    w.fire.queue.push({ id: ++w.nextId });
    expect(w.fire.queue).toHaveLength(1);
    // First tick: promotion at start (cooking full, nothing promoted), then all 5 finish
    updateFire(w, 0.1);
    expect(w.meatCooked).toHaveLength(w.fire.capacity); // 5 cooked
    expect(w.fire.cooking).toHaveLength(0); // cooking empty
    expect(w.fire.queue).toHaveLength(1); // queue piece still waiting

    // Second tick: promotion runs again at start → queue piece promoted into cooking
    updateFire(w, 0.016);
    expect(w.fire.queue).toHaveLength(0);
    expect(w.fire.cooking).toHaveLength(1);
  });

  it('cook employee near fire counts as supervisor', () => {
    const w = createWorld();
    // Player far away
    w.player.pos = { x: -10, y: 0, z: -10 };
    // Add a cook at fire
    w.employees.push({
      id: ++w.nextId, type: 'cook',
      pos: { x: w.fire.pos.x, z: w.fire.pos.z },
      state: 'idle', stack: {},
    });
    w.fire.cooking.push({ id: ++w.nextId, timer: BALANCE.fire.cookTimer });
    const before = w.fire.cooking[0].timer;
    updateFire(w, 0.5);
    expect(w.fire.cooking[0].timer).toBeCloseTo(before - 0.5, 5);
  });
});
