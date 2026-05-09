import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateEmployee } from '../../src/systems/employee.js';
import { BALANCE } from '../../src/balance.js';

function spawnTanner(w, x, z) {
  const tanner = {
    id: ++w.nextId, type: 'tanner',
    pos: { x, z }, rot: 0,
    state: 'idle', target: null,
    stack: { pelt: 0, max: BALANCE.worker.tannerStackMax },
  };
  w.employees.push(tanner);
  return tanner;
}

function dropPelt(w, x, z) {
  const piece = { id: ++w.nextId, pos: { x, z }, despawnTimer: 60 };
  w.pelts.push(piece);
  return piece;
}

describe('tanner employee', () => {
  it('idle tanner with no pelts stays idle', () => {
    const w = createWorld();
    const tanner = spawnTanner(w, 0, 0);
    updateEmployee(w, 0.016);
    expect(tanner.state).toBe('idle');
  });

  it('idle tanner finds nearest pelt and transitions to going-to-pelt', () => {
    const w = createWorld();
    const tanner = spawnTanner(w, 0, 0);
    const piece = dropPelt(w, 1, 0);
    updateEmployee(w, 0.016);
    expect(tanner.state).toBe('going-to-pelt');
    expect(tanner.target).toBe(piece.id);
  });

  it('tanner picks up pelt when within pickup radius, increments stack, returns to idle', () => {
    const w = createWorld();
    const tanner = spawnTanner(w, 0, 0);
    const piece = dropPelt(w, 0.2, 0); // within 0.8 pickup radius
    tanner.state = 'going-to-pelt';
    tanner.target = piece.id;
    updateEmployee(w, 0.1);
    expect(w.pelts).toHaveLength(0);
    expect(tanner.stack.pelt).toBe(1);
    expect(tanner.state).toBe('idle');
    expect(tanner.target).toBeNull();
  });

  it('tanner with full stack transitions idle → going-to-tannery', () => {
    const w = createWorld();
    const tanner = spawnTanner(w, 0, 0);
    tanner.stack.pelt = tanner.stack.max; // full
    dropPelt(w, 1, 0); // some pelts available but stack full
    updateEmployee(w, 0.016);
    expect(tanner.state).toBe('going-to-tannery');
  });

  it('tanner dumps pelt stack at tannery when within transferRange', () => {
    const w = createWorld();
    const tanner = spawnTanner(w, w.tannery.pos.x, w.tannery.pos.z);
    tanner.stack.pelt = 3;
    tanner.state = 'going-to-tannery';
    const beforeProcessing = w.tannery.processing.length;
    updateEmployee(w, 0.016);
    const added = w.tannery.processing.length - beforeProcessing;
    expect(added).toBe(3);
    expect(tanner.stack.pelt).toBe(0);
    expect(tanner.state).toBe('idle');
  });

  it('tanner re-targets idle when targeted pelt disappears', () => {
    const w = createWorld();
    const tanner = spawnTanner(w, 5, 5);
    const piece = dropPelt(w, 6, 5);
    tanner.state = 'going-to-pelt';
    tanner.target = piece.id;
    // Remove the piece externally
    w.pelts.splice(0, 1);
    updateEmployee(w, 0.016);
    expect(tanner.state).toBe('idle');
    expect(tanner.target).toBeNull();
  });
});
