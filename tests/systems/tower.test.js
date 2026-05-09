import { describe, it, expect } from 'vitest';
import { createWorld, spawnBear, killBear } from '../../src/world.js';
import { update as updateTower } from '../../src/systems/tower.js';
import { BALANCE } from '../../src/balance.js';

function makeTower(world, overrides = {}) {
  const tower = {
    id: ++world.nextId,
    pos: { x: 0, z: 0 },
    slot: 0,
    level: 1,
    fireCooldown: 0,
    target: null,
    ...overrides,
  };
  world.towers.push(tower);
  return tower;
}

describe('tower system', () => {
  it('tower acquires nearest bear within range', () => {
    const w = createWorld();
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1 });
    const stats = BALANCE.tower.levels[0]; // range: 8
    // Bear within range
    const bear = spawnBear(w, { x: stats.range - 1, z: 0 });
    updateTower(w, 0.1);
    expect(tower.target).toBe(bear.id);
  });

  it('tower does not acquire bear outside range', () => {
    const w = createWorld();
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1 });
    const stats = BALANCE.tower.levels[0]; // range: 8
    // Bear outside range
    spawnBear(w, { x: stats.range + 1, z: 0 });
    updateTower(w, 0.1);
    expect(tower.target).toBeNull();
  });

  it('tower picks nearest bear when multiple are in range', () => {
    const w = createWorld();
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1 });
    const stats = BALANCE.tower.levels[0]; // range: 8
    const farBear = spawnBear(w, { x: stats.range - 1, z: 0 });
    const nearBear = spawnBear(w, { x: 2, z: 0 });
    updateTower(w, 0.1);
    expect(tower.target).toBe(nearBear.id);
  });

  it('tower deals damage to target at fireCD intervals', () => {
    const w = createWorld();
    const stats = BALANCE.tower.levels[0]; // damage: 25, fireCD: 1.5
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1, fireCooldown: 0 });
    const bear = spawnBear(w, { x: 3, z: 0 });
    const initialHp = bear.hp;
    updateTower(w, 0.1);
    // First frame: acquires target and fires (cooldown was 0)
    expect(bear.hp).toBe(initialHp - stats.damage);
    expect(tower.fireCooldown).toBeGreaterThan(0);

    // Before cooldown expires, no more damage
    updateTower(w, 0.1);
    expect(bear.hp).toBe(initialHp - stats.damage);

    // After cooldown expires, fires again
    updateTower(w, stats.fireCD);
    expect(bear.hp).toBe(initialHp - stats.damage * 2);
  });

  it('tower kills bear when hp drops to 0', () => {
    const w = createWorld();
    const stats = BALANCE.tower.levels[0]; // damage: 25
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1, fireCooldown: 0 });
    const bear = spawnBear(w, { x: 3, z: 0 });
    // Set hp just low enough to die in one hit
    bear.hp = stats.damage;
    updateTower(w, 0.1);
    expect(w.bears).toHaveLength(0);
    // killBear drops meatDrops pieces of raw meat
    expect(w.meatRaw).toHaveLength(BALANCE.bear.meatDrops);
    expect(tower.target).toBeNull();
  });

  it('tower clears target when bear leaves range', () => {
    const w = createWorld();
    const stats = BALANCE.tower.levels[0]; // range: 8
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1, fireCooldown: 10 });
    const bear = spawnBear(w, { x: 3, z: 0 });
    tower.target = bear.id;
    // Move bear out of range
    bear.pos.x = stats.range + 2;
    updateTower(w, 0.1);
    expect(tower.target).toBeNull();
  });

  it('tower clears target when bear dies externally', () => {
    const w = createWorld();
    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 1, fireCooldown: 10 });
    const bear = spawnBear(w, { x: 3, z: 0 });
    tower.target = bear.id;
    // Kill bear externally (not by tower)
    killBear(w, bear);
    expect(w.bears).toHaveLength(0);
    updateTower(w, 0.1);
    expect(tower.target).toBeNull();
  });

  it('tower level 2 has higher damage and range', () => {
    const w = createWorld();
    const statsL1 = BALANCE.tower.levels[0];
    const statsL2 = BALANCE.tower.levels[1];
    expect(statsL2.damage).toBeGreaterThan(statsL1.damage);
    expect(statsL2.range).toBeGreaterThan(statsL1.range);
    expect(statsL2.fireCD).toBeLessThan(statsL1.fireCD);

    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 2, fireCooldown: 0 });
    // Bear within L2 range but outside L1 range
    const bear = spawnBear(w, { x: statsL2.range - 0.5, z: 0 });
    const initialHp = bear.hp;
    updateTower(w, 0.1);
    expect(tower.target).toBe(bear.id);
    expect(bear.hp).toBe(initialHp - statsL2.damage);
  });

  it('tower level 3 has highest damage and range', () => {
    const w = createWorld();
    const statsL3 = BALANCE.tower.levels[2];
    expect(statsL3.damage).toBe(60);
    expect(statsL3.range).toBe(10);
    expect(statsL3.fireCD).toBe(0.8);

    const tower = makeTower(w, { pos: { x: 0, z: 0 }, level: 3, fireCooldown: 0 });
    const bear = spawnBear(w, { x: statsL3.range - 0.5, z: 0 });
    const initialHp = bear.hp;
    updateTower(w, 0.1);
    expect(bear.hp).toBe(initialHp - statsL3.damage);
  });
});
