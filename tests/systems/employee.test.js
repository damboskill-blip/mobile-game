import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateEmployee, hasCashier, currentBuyDuration } from '../../src/systems/employee.js';
import { BALANCE } from '../../src/balance.js';

function spawnCook(w, x, z) {
  const cook = {
    id: ++w.nextId, type: 'cook',
    pos: { x, z }, rot: 0,
    state: 'idle', target: null, carrying: false,
  };
  w.employees.push(cook);
  return cook;
}

function dropCooked(w, x, z) {
  const piece = { id: ++w.nextId, pos: { x, z }, despawnTimer: 60 };
  w.meatCooked.push(piece);
  return piece;
}

describe('cook employee', () => {
  it('idle cook with no nearby cooked stays idle', () => {
    const w = createWorld();
    const cook = spawnCook(w, w.fire.pos.x, w.fire.pos.z);
    updateEmployee(w, 0.016);
    expect(cook.state).toBe('idle');
  });

  it('idle cook with cooked nearby targets it and walks toward it', () => {
    const w = createWorld();
    const cook = spawnCook(w, w.fire.pos.x, w.fire.pos.z);
    const piece = dropCooked(w, w.fire.pos.x + 1, w.fire.pos.z);
    updateEmployee(w, 0.016);
    expect(cook.state).toBe('going-to-cooked');
    expect(cook.target).toBe(piece.id);
  });

  it('cook picks up cooked piece when reaching it and switches to carrying', () => {
    const w = createWorld();
    const cook = spawnCook(w, w.fire.pos.x, w.fire.pos.z);
    const piece = dropCooked(w, w.fire.pos.x + 0.1, w.fire.pos.z);
    cook.state = 'going-to-cooked';
    cook.target = piece.id;
    updateEmployee(w, 0.5);
    expect(w.meatCooked).toHaveLength(0);
    expect(cook.state).toBe('going-to-counter');
    expect(cook.carrying).toBe(true);
  });

  it('carrying cook delivers to counter (counterStack++) and returns to idle', () => {
    const w = createWorld();
    const cook = spawnCook(w, w.register.pos.x, w.register.pos.z);
    cook.state = 'going-to-counter';
    cook.carrying = true;
    cook.pos = { x: w.register.pos.x + 0.1, z: w.register.pos.z };
    const before = w.register.counterStack;
    updateEmployee(w, 0.5);
    expect(w.register.counterStack).toBe(before + 1);
    expect(cook.carrying).toBe(false);
    expect(cook.state).toBe('idle');
  });
});

describe('cashier helper', () => {
  it('hasCashier returns false when no cashier hired', () => {
    const w = createWorld();
    expect(hasCashier(w)).toBe(false);
  });

  it('hasCashier returns true when cashier in employees', () => {
    const w = createWorld();
    w.employees.push({ id: 1, type: 'cashier', pos: { x: 0, z: 0 } });
    expect(hasCashier(w)).toBe(true);
  });

  it('currentBuyDuration is BALANCE without cashier, halved with cashier', () => {
    const w = createWorld();
    expect(currentBuyDuration(w)).toBe(BALANCE.customer.buyDuration);
    w.employees.push({ id: 1, type: 'cashier', pos: { x: 0, z: 0 } });
    expect(currentBuyDuration(w)).toBeCloseTo(BALANCE.customer.buyDuration / 2, 5);
  });
});
