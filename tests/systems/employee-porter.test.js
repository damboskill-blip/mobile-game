import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateEmployee } from '../../src/systems/employee.js';
import { BALANCE } from '../../src/balance.js';

function spawnPorter(w, x, z) {
  const porter = {
    id: ++w.nextId, type: 'porter',
    pos: { x, z }, rot: 0,
    state: 'idle', target: null,
    stack: { raw: 0, max: BALANCE.worker.porterStackMax },
  };
  w.employees.push(porter);
  return porter;
}

function dropRaw(w, x, z) {
  const piece = { id: ++w.nextId, pos: { x, z }, despawnTimer: 60 };
  w.meatRaw.push(piece);
  return piece;
}

describe('porter employee', () => {
  it('idle porter with no raw meat stays idle', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('idle');
  });

  it('idle porter finds nearest raw meat and transitions to going-to-meat', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    const piece = dropRaw(w, 1, 0);
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('going-to-meat');
    expect(porter.target).toBe(piece.id);
  });

  it('idle porter picks nearer piece when multiple raw exist', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    const near = dropRaw(w, 1, 0);
    dropRaw(w, 10, 0);
    updateEmployee(w, 0.016);
    expect(porter.target).toBe(near.id);
  });

  it('porter picks up raw when within pickup radius, increments stack, returns to idle', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    const piece = dropRaw(w, 0.2, 0); // within PORTER_PICKUP_RADIUS (0.8)
    porter.state = 'going-to-meat';
    porter.target = piece.id;
    updateEmployee(w, 0.1);
    expect(w.meatRaw).toHaveLength(0);
    expect(porter.stack.raw).toBe(1);
    expect(porter.state).toBe('idle');
    expect(porter.target).toBeNull();
  });

  it('porter with full stack transitions idle → going-to-fire', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    porter.stack.raw = porter.stack.max; // full
    dropRaw(w, 1, 0); // some raw available but stack full
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('going-to-fire');
  });

  it('porter with no raw and partial stack transitions idle → going-to-fire', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    porter.stack.raw = 2; // partial, nothing to pick up
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('going-to-fire');
  });

  it('porter dumps stack at fire when within transferRange', () => {
    const w = createWorld();
    // Place porter right at fire
    const porter = spawnPorter(w, w.fire.pos.x, w.fire.pos.z);
    porter.stack.raw = 3;
    porter.state = 'going-to-fire';
    const beforeCooking = w.fire.cooking.length;
    updateEmployee(w, 0.016);
    const added = w.fire.cooking.length - beforeCooking;
    expect(added).toBe(3);
    expect(porter.stack.raw).toBe(0);
    expect(porter.state).toBe('idle');
  });

  it('porter only dumps up to fire capacity', () => {
    const w = createWorld();
    // Fill fire most of the way
    const slotsAlready = w.fire.capacity - 1;
    for (let i = 0; i < slotsAlready; i++) {
      w.fire.cooking.push({ id: ++w.nextId, timer: 2 });
    }
    const porter = spawnPorter(w, w.fire.pos.x, w.fire.pos.z);
    porter.stack.raw = 3;
    porter.state = 'going-to-fire';
    updateEmployee(w, 0.016);
    // Only 1 slot free, should dump 1
    expect(w.fire.cooking.length).toBe(w.fire.capacity);
    expect(porter.stack.raw).toBe(2); // 3 - 1
    expect(porter.state).toBe('idle');
  });

  it('porter state machine: idle → going-to-meat → picks up → idle → going-to-fire (full stack)', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 0, 0);
    porter.stack.max = 1; // so one pickup fills it

    // Drop raw right next to porter
    const piece = dropRaw(w, 0.1, 0);

    // Tick 1: find raw
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('going-to-meat');

    // Tick 2: reach and pick up
    updateEmployee(w, 0.5);
    expect(porter.stack.raw).toBe(1);
    expect(porter.state).toBe('idle');

    // Tick 3: stack full, go to fire
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('going-to-fire');
  });

  it('porter re-targets idle when targeted raw piece disappears', () => {
    const w = createWorld();
    const porter = spawnPorter(w, 5, 5);
    const piece = dropRaw(w, 6, 5);
    porter.state = 'going-to-meat';
    porter.target = piece.id;
    // Remove the piece externally
    w.meatRaw.splice(0, 1);
    updateEmployee(w, 0.016);
    expect(porter.state).toBe('idle');
    expect(porter.target).toBeNull();
  });
});
