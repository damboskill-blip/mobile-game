import { describe, it, expect } from 'vitest';
import { createWorld, dropMeatRaw } from '../../src/world.js';
import { update as updatePlayer } from '../../src/systems/player.js';
import { spawnBear } from '../../src/world.js';
import { BALANCE } from '../../src/balance.js';

describe('player movement', () => {
  it('moves along input vector at player speed', () => {
    const w = createWorld();
    w.player.input.move = { x: 1, z: 0 };
    updatePlayer(w, 0.1);
    expect(w.player.pos.x).toBeCloseTo(0.5, 5); // 5 units/sec * 0.1 sec
    expect(w.player.pos.z).toBeCloseTo(0, 5);
  });

  it('does not move when input is zero', () => {
    const w = createWorld();
    w.player.input.move = { x: 0, z: 0 };
    updatePlayer(w, 1.0);
    expect(w.player.pos.x).toBe(0);
    expect(w.player.pos.z).toBe(0);
  });

  it('normalizes diagonal input to avoid 1.41x speed', () => {
    const w = createWorld();
    w.player.input.move = { x: 1, z: 1 };
    updatePlayer(w, 1.0);
    const dist = Math.hypot(w.player.pos.x, w.player.pos.z);
    expect(dist).toBeCloseTo(5.0, 5);
  });

  it('updates rotation to face movement direction', () => {
    const w = createWorld();
    w.player.input.move = { x: 0, z: 1 };
    updatePlayer(w, 0.1);
    // moving +Z → mesh faces +Z (Three.js Y-rotation 0)
    expect(w.player.rot).toBeCloseTo(0, 5);
  });

  it('rotation is π/2 when moving +X', () => {
    const w = createWorld();
    w.player.input.move = { x: 1, z: 0 };
    updatePlayer(w, 0.1);
    expect(w.player.rot).toBeCloseTo(Math.PI / 2, 5);
  });

  it('does not update when player.state is dead', () => {
    const w = createWorld();
    w.player.state = 'dead';
    w.player.input.move = { x: 1, z: 0 };
    const startX = w.player.pos.x;
    updatePlayer(w, 1.0);
    expect(w.player.pos.x).toBe(startX);
  });
});

describe('player auto-attack', () => {
  it('targets nearest bear within axe.range', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    const closeBear = spawnBear(w, { x: 1.0, z: 0 });
    const farBear = spawnBear(w, { x: 5.0, z: 0 });
    const farHpBefore = farBear.hp;
    updatePlayer(w, 0.5);
    expect(closeBear.hp).toBeLessThan(BALANCE.bear.hpBase);
    expect(farBear.hp).toBe(farHpBefore);
  });

  it('does not attack bears outside axe.range', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    const farBear = spawnBear(w, { x: 5.0, z: 0 });
    const hpBefore = farBear.hp;
    updatePlayer(w, 1.0);
    expect(farBear.hp).toBe(hpBefore);
  });

  it('respects axe.cooldown between attacks', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    const bear = spawnBear(w, { x: 0.5, z: 0 });
    updatePlayer(w, 0.016); // first hit lands
    const hpAfterFirst = bear.hp;
    updatePlayer(w, 0.1); // less than cooldown 0.4 — no second hit
    expect(bear.hp).toBe(hpAfterFirst);
    updatePlayer(w, BALANCE.player.axe.cooldown); // total > cooldown
    expect(bear.hp).toBeLessThan(hpAfterFirst);
  });

  it('does not attack when state is dead', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.state = 'dead';
    const bear = spawnBear(w, { x: 0.5, z: 0 });
    const hpBefore = bear.hp;
    updatePlayer(w, 1.0);
    expect(bear.hp).toBe(hpBefore);
  });
});

describe('player death and respawn', () => {
  it('transitions to dead when hp reaches 0', () => {
    const w = createWorld();
    w.player.hp = 0;
    updatePlayer(w, 0.016);
    expect(w.player.state).toBe('dead');
    expect(w.player.respawnTimer).toBe(BALANCE.player.respawn);
  });

  it('drops carried raw meat at death position', () => {
    const w = createWorld();
    w.player.hp = 0;
    w.player.pos = { x: 5, y: 0, z: 5 };
    w.player.stack = { type: 'raw', count: 3, max: BALANCE.player.stack.max };
    const droppedBefore = w.meatRaw.length;
    updatePlayer(w, 0.016);
    expect(w.meatRaw.length).toBe(droppedBefore + 3);
    expect(w.player.stack.count).toBe(0);
    expect(w.player.stack.type).toBe(null);
  });

  it('drops carried cooked meat as cooked', () => {
    const w = createWorld();
    w.player.hp = 0;
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.stack = { type: 'cooked', count: 2, max: BALANCE.player.stack.max };
    updatePlayer(w, 0.016);
    expect(w.meatCooked.length).toBe(2);
  });

  it('respawn timer counts down while dead', () => {
    const w = createWorld();
    w.player.state = 'dead';
    w.player.respawnTimer = 1.0;
    updatePlayer(w, 0.4);
    expect(w.player.respawnTimer).toBeCloseTo(0.6, 5);
    expect(w.player.state).toBe('dead');
  });

  it('respawns at base center with full HP when timer reaches 0', () => {
    const w = createWorld();
    w.player.state = 'dead';
    w.player.respawnTimer = 0.05;
    w.player.hp = 0;
    w.player.pos = { x: 99, y: 0, z: 99 };
    updatePlayer(w, 0.1);
    expect(w.player.state).toBe('alive');
    expect(w.player.hp).toBe(BALANCE.player.hpMax);
    expect(w.player.pos).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('player hp regen', () => {
  it('regenerates hp when alive and below max', () => {
    const w = createWorld();
    w.player.hp = 50;
    updatePlayer(w, 1.0);
    expect(w.player.hp).toBeCloseTo(50 + BALANCE.player.regenRate, 5);
  });

  it('does not regen above hpMax', () => {
    const w = createWorld();
    w.player.hp = w.player.hpMax - 1;
    updatePlayer(w, 10.0); // would add 100, but capped
    expect(w.player.hp).toBe(w.player.hpMax);
  });

  it('does not regen while dead', () => {
    const w = createWorld();
    w.player.state = 'dead';
    w.player.respawnTimer = 5; // prevent respawn during this test
    w.player.hp = 0;
    updatePlayer(w, 1.0);
    expect(w.player.hp).toBe(0);
  });
});

describe('balance regenRate', () => {
  it('regenRate is positive', () => {
    expect(BALANCE.player.regenRate).toBeGreaterThan(0);
  });
});
