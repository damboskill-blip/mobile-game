import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateCustomer, spawnCustomer } from '../../src/systems/customer.js';
import { BALANCE } from '../../src/balance.js';

describe('customer spawn', () => {
  it('spawnCustomer adds customer at the spawn ring with entering state', () => {
    const w = createWorld();
    const c = spawnCustomer(w);
    expect(w.customers).toHaveLength(1);
    expect(c.state).toBe('entering');
    const dist = Math.hypot(c.pos.x, c.pos.z);
    expect(dist).toBeCloseTo(BALANCE.customer.spawnRingRadius, 0);
  });

  it('does not spawn beyond queueMax', () => {
    const w = createWorld();
    w.register.counterStack = 100;
    for (let i = 0; i < BALANCE.customer.queueMax; i++) spawnCustomer(w);
    w.customerSpawnTimer = 0;
    updateCustomer(w, 0.016);
    expect(w.customers.length).toBeLessThanOrEqual(BALANCE.customer.queueMax);
  });

  it('spawn timer triggers a spawn when counterStack > 0 OR queue under softMin', () => {
    const w = createWorld();
    w.register.counterStack = 10;
    w.customerSpawnTimer = 0;
    updateCustomer(w, 0.016);
    expect(w.customers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('customer AI', () => {
  it('entering customer walks toward queue slot', () => {
    const w = createWorld();
    const c = spawnCustomer(w);
    const before = Math.hypot(c.pos.x - w.register.pos.x, c.pos.z - w.register.pos.z);
    updateCustomer(w, 0.5);
    const after = Math.hypot(c.pos.x - w.register.pos.x, c.pos.z - w.register.pos.z);
    expect(after).toBeLessThan(before);
  });

  it('entering → queuing when at queue slot', () => {
    const w = createWorld();
    const c = spawnCustomer(w);
    // Teleport close to queue slot
    c.pos = { x: w.register.pos.x + BALANCE.customer.queueOffset * 0.1, z: w.register.pos.z };
    updateCustomer(w, 0.016);
    expect(c.state).toBe('queuing');
  });

  it('front-of-queue customer with stock enters buying state', () => {
    const w = createWorld();
    const c = spawnCustomer(w);
    c.state = 'queuing';
    c.pos = { x: w.register.pos.x, z: w.register.pos.z };
    w.register.counterStack = 5;
    updateCustomer(w, 0.016);
    expect(c.state).toBe('buying');
    expect(c.buyTimer).toBeGreaterThan(0);
  });

  it('buying completes after buyDuration: counterStack-- and money pile spawned', () => {
    const w = createWorld();
    const c = spawnCustomer(w);
    c.state = 'buying';
    c.buyTimer = 0.05;
    c.pos = { x: w.register.pos.x, z: w.register.pos.z };
    w.register.counterStack = 3;
    updateCustomer(w, 0.1);
    expect(w.register.counterStack).toBe(2);
    expect(w.register.moneyPiles).toHaveLength(1);
    expect(w.register.moneyPiles[0].amount).toBe(BALANCE.customer.pricePerPiece);
    expect(c.state).toBe('leaving');
  });

  it('leaving customer walks toward spawn ring then despawns', () => {
    const w = createWorld();
    const c = spawnCustomer(w);
    c.state = 'leaving';
    c.pos = { x: BALANCE.customer.spawnRingRadius - 0.1, z: 0 }; // already at the edge
    updateCustomer(w, 0.5);
    expect(w.customers).toHaveLength(0);
  });

  it('with cashier hired, customer.buyTimer is halved', () => {
    const w = createWorld();
    w.employees.push({ id: 999, type: 'cashier', pos: { x: 0, z: 0 } });
    const c = spawnCustomer(w);
    c.state = 'queuing';
    c.pos = { x: w.register.pos.x, z: w.register.pos.z };
    w.register.counterStack = 5;
    updateCustomer(w, 0.016);
    expect(c.state).toBe('buying');
    expect(c.buyTimer).toBeCloseTo(BALANCE.customer.buyDuration / 2, 5);
  });
});
