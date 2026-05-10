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
    expect(w.player.pos.x).toBeCloseTo(BALANCE.player.speed * 0.1, 5); // speed * 0.1 sec
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
    expect(dist).toBeCloseTo(BALANCE.player.speed * 1.0, 5);
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
    w.player.stack = { raw: 3, cooked: 0, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.meatRaw.length).toBe(3);
    expect(w.player.stack.raw).toBe(0);
    expect(w.player.stack.cooked).toBe(0);
  });

  it('drops carried cooked meat as cooked', () => {
    const w = createWorld();
    w.player.hp = 0;
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.stack = { raw: 0, cooked: 2, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.meatCooked.length).toBe(2);
  });

  it('drops both raw and cooked when carrying mixed stack', () => {
    const w = createWorld();
    w.player.hp = 0;
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.stack = { raw: 4, cooked: 3, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.meatRaw.length).toBe(4);
    expect(w.meatCooked.length).toBe(3);
    expect(w.player.stack.raw).toBe(0);
    expect(w.player.stack.cooked).toBe(0);
  });

  it('drops pelts and leather on death', () => {
    const w = createWorld();
    w.player.hp = 0;
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.stack = { raw: 0, cooked: 0, pelt: 2, leather: 1 };
    updatePlayer(w, 0.016);
    expect(w.pelts.length).toBe(2);
    expect(w.leather.length).toBe(1);
    expect(w.player.stack.pelt).toBe(0);
    expect(w.player.stack.leather).toBe(0);
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

describe('player → fire transfer', () => {
  it('transfers raw stack into fire.queue when within transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { raw: 3, cooked: 0, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.fire.queue).toHaveLength(3);
    expect(w.player.stack.raw).toBe(0);
  });

  it('transfers all raw into queue with no capacity limit at transfer', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { raw: 20, cooked: 0, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.fire.queue.length + w.fire.cooking.length).toBe(20);
    expect(w.player.stack.raw).toBe(0);
  });

  it('does not transfer cooked meat to fire', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { raw: 0, cooked: 3, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.fire.queue).toHaveLength(0);
    expect(w.fire.cooking).toHaveLength(0);
    expect(w.player.stack.cooked).toBe(3);
  });

  it('does not transfer when player is outside transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 5, y: 0, z: w.fire.pos.z };
    w.player.stack = { raw: 2, cooked: 0, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.fire.queue).toHaveLength(0);
    expect(w.player.stack.raw).toBe(2);
  });
});

describe('player → counter transfer', () => {
  it('transfers cooked stack onto counter when within transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 0.5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 0, cooked: 4, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(4);
    expect(w.player.stack.cooked).toBe(0);
  });

  it('does not transfer raw to counter', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 0.5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 4, cooked: 0, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(0);
    expect(w.player.stack.raw).toBe(4);
  });

  it('does not transfer outside transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 0, cooked: 3, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(0);
    expect(w.player.stack.cooked).toBe(3);
  });

  it('counter has no max (accepts all cooked)', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 0.5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 0, cooked: 50, pelt: 0, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(50);
    expect(w.player.stack.cooked).toBe(0);
  });
});

describe('player → tannery transfer', () => {
  it('transfers pelt stack into tannery.queue when within transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.tannery.pos.x + 0.5, y: 0, z: w.tannery.pos.z };
    w.player.stack = { raw: 0, cooked: 0, pelt: 3, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.tannery.queue).toHaveLength(3);
    expect(w.player.stack.pelt).toBe(0);
  });

  it('does not transfer when player is outside transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.tannery.pos.x + 5, y: 0, z: w.tannery.pos.z };
    w.player.stack = { raw: 0, cooked: 0, pelt: 2, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.tannery.queue).toHaveLength(0);
    expect(w.player.stack.pelt).toBe(2);
  });

  it('transfers all pelts into queue with no capacity limit at transfer', () => {
    const w = createWorld();
    w.player.pos = { x: w.tannery.pos.x + 0.5, y: 0, z: w.tannery.pos.z };
    w.player.stack = { raw: 0, cooked: 0, pelt: 20, leather: 0 };
    updatePlayer(w, 0.016);
    expect(w.tannery.queue.length + w.tannery.processing.length).toBe(20);
    expect(w.player.stack.pelt).toBe(0);
  });
});

describe('player → leather counter transfer', () => {
  it('transfers leather stack onto leather counter when within transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.leatherCounter.pos.x + 0.5, y: 0, z: w.leatherCounter.pos.z };
    w.player.stack = { raw: 0, cooked: 0, pelt: 0, leather: 4 };
    updatePlayer(w, 0.016);
    expect(w.leatherCounter.counterStack).toBe(4);
    expect(w.player.stack.leather).toBe(0);
  });

  it('does not transfer when player is outside transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.leatherCounter.pos.x + 5, y: 0, z: w.leatherCounter.pos.z };
    w.player.stack = { raw: 0, cooked: 0, pelt: 0, leather: 3 };
    updatePlayer(w, 0.016);
    expect(w.leatherCounter.counterStack).toBe(0);
    expect(w.player.stack.leather).toBe(3);
  });
});
