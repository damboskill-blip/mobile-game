import { describe, it, expect } from 'vitest';
import { BALANCE, BALANCE_VERSION, bearSpawnPeriod, bearHp, bearDamageFence } from '../src/balance.js';

describe('balance', () => {
  it('exposes a numeric BALANCE_VERSION', () => {
    expect(typeof BALANCE_VERSION).toBe('number');
    expect(BALANCE_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('player has expected foundation constants', () => {
    expect(BALANCE.player.speed).toBe(5);
    expect(BALANCE.player.hpMax).toBe(100);
    expect(BALANCE.player.respawn).toBe(2);
    expect(BALANCE.player.pickupRadius).toBe(1.0);
  });

  it('base radius is positive and finite', () => {
    expect(BALANCE.base.radius).toBeGreaterThan(0);
    expect(Number.isFinite(BALANCE.base.radius)).toBe(true);
  });
});

describe('difficulty scaling', () => {
  it('bear spawn period decreases over time, clamped at 1.0', () => {
    expect(bearSpawnPeriod(0)).toBe(4.0);
    expect(bearSpawnPeriod(5)).toBeCloseTo(2.5, 5);
    expect(bearSpawnPeriod(10)).toBe(1.0);
    expect(bearSpawnPeriod(100)).toBe(1.0);
  });

  it('bear hp grows linearly with time', () => {
    expect(bearHp(0)).toBe(70);
    expect(bearHp(2)).toBe(80);
  });

  it('bear damage to fence is clamped 10..20', () => {
    expect(bearDamageFence(0)).toBe(10);
    expect(bearDamageFence(5)).toBe(15);
    expect(bearDamageFence(100)).toBe(20);
  });
});
