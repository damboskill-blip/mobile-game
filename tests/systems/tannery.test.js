import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateTannery } from '../../src/systems/tannery.js';
import { BALANCE } from '../../src/balance.js';

// Helper: place player inside tannery superviseRadius so processing ticks
function superviseByPlayer(world) {
  world.player.state = 'alive';
  world.player.pos.x = world.tannery.pos.x;
  world.player.pos.z = world.tannery.pos.z;
}

describe('tannery processing', () => {
  it('tanTime ticks down when player supervises', () => {
    const w = createWorld();
    superviseByPlayer(w);
    w.tannery.processing.push({ id: ++w.nextId, timer: BALANCE.tannery.tanTime });
    const before = w.tannery.processing[0].timer;
    updateTannery(w, 0.5);
    expect(w.tannery.processing[0].timer).toBeCloseTo(before - 0.5, 5);
  });

  it('tanTime does NOT tick when player is far and no tanner employee', () => {
    const w = createWorld();
    w.player.pos = { x: -10, y: 0, z: -10 };
    w.tannery.processing.push({ id: ++w.nextId, timer: BALANCE.tannery.tanTime });
    const before = w.tannery.processing[0].timer;
    updateTannery(w, 0.5);
    expect(w.tannery.processing[0].timer).toBe(before);
  });

  it('removes piece from processing and spawns leather on ground when timer reaches 0 (supervised)', () => {
    const w = createWorld();
    superviseByPlayer(w);
    w.tannery.processing.push({ id: ++w.nextId, timer: 0.05 });
    updateTannery(w, 0.1);
    expect(w.tannery.processing).toHaveLength(0);
    expect(w.leather).toHaveLength(1);
  });

  it('leather spawn position is near tannery pos within ~1.2 units', () => {
    const w = createWorld();
    superviseByPlayer(w);
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

  it('processes multiple pieces in same frame (supervised)', () => {
    const w = createWorld();
    superviseByPlayer(w);
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

  it('promotes pieces from queue to processing up to capacity', () => {
    const w = createWorld();
    for (let i = 0; i < 8; i++) w.tannery.queue.push({ id: ++w.nextId });
    updateTannery(w, 0.016);
    expect(w.tannery.processing).toHaveLength(w.tannery.capacity);
    expect(w.tannery.queue).toHaveLength(8 - w.tannery.capacity);
  });

  it('tanner employee near tannery counts as supervisor', () => {
    const w = createWorld();
    w.player.pos = { x: -10, y: 0, z: -10 };
    w.employees.push({
      id: ++w.nextId, type: 'tanner',
      pos: { x: w.tannery.pos.x, z: w.tannery.pos.z },
      state: 'idle', stack: {},
    });
    w.tannery.processing.push({ id: ++w.nextId, timer: BALANCE.tannery.tanTime });
    const before = w.tannery.processing[0].timer;
    updateTannery(w, 0.5);
    expect(w.tannery.processing[0].timer).toBeCloseTo(before - 0.5, 5);
  });
});
