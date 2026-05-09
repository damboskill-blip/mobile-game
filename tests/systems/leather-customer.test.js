import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateLeatherCustomer, spawnPremiumCustomer } from '../../src/systems/leather-customer.js';
import { BALANCE } from '../../src/balance.js';

describe('premium customer spawn', () => {
  it('spawnPremiumCustomer adds customer at the spawn ring with entering state', () => {
    const w = createWorld();
    const c = spawnPremiumCustomer(w);
    expect(w.premiumCustomers).toHaveLength(1);
    expect(c.state).toBe('entering');
    const dist = Math.hypot(c.pos.x, c.pos.z);
    expect(dist).toBeCloseTo(BALANCE.customer.premiumSpawnRingRadius, 0);
  });

  it('does not spawn beyond queueMax', () => {
    const w = createWorld();
    w.leatherCounter.counterStack = 100;
    for (let i = 0; i < BALANCE.customer.queueMax; i++) spawnPremiumCustomer(w);
    w.premiumCustomerSpawnTimer = 0;
    updateLeatherCustomer(w, 0.016);
    expect(w.premiumCustomers.length).toBeLessThanOrEqual(BALANCE.customer.queueMax);
  });
});

describe('premium customer AI', () => {
  it('buying completes: leatherCounter.counterStack decrements and money pile spawned at premiumPricePerLeather', () => {
    const w = createWorld();
    const c = spawnPremiumCustomer(w);
    c.state = 'buying';
    c.buyTimer = 0.05;
    c.pos = { x: w.leatherCounter.pos.x, z: w.leatherCounter.pos.z };
    w.leatherCounter.counterStack = 3;
    updateLeatherCustomer(w, 0.1);
    expect(w.leatherCounter.counterStack).toBe(2);
    expect(w.leatherCounter.moneyPiles).toHaveLength(1);
    expect(w.leatherCounter.moneyPiles[0].amount).toBe(BALANCE.customer.premiumPricePerLeather);
    expect(c.state).toBe('leaving');
  });

  it('leaving customer despawns when it reaches the ring edge', () => {
    const w = createWorld();
    const c = spawnPremiumCustomer(w);
    c.state = 'leaving';
    c.pos = { x: BALANCE.customer.premiumSpawnRingRadius - 0.1, z: 0 };
    updateLeatherCustomer(w, 0.5);
    expect(w.premiumCustomers).toHaveLength(0);
  });
});
