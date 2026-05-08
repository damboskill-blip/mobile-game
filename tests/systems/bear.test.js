import { describe, it, expect } from 'vitest';
import { createWorld, spawnBear } from '../../src/world.js';
import { update as updateBear, findNearestUnbrokenSegment } from '../../src/systems/bear.js';
import { BALANCE } from '../../src/balance.js';

describe('bear AI — approaching', () => {
  it('finds the nearest unbroken fence segment', () => {
    const w = createWorld();
    // Put a bear far north
    const seg = findNearestUnbrokenSegment(w, { x: 0, z: 13 });
    expect(seg).not.toBeNull();
    // Closest segment to (0, 13) — first segment is at (radius, 0); the closest
    // segment to (0, 13) is whichever is along +z axis.
    expect(Math.hypot(seg.pos.x - 0, seg.pos.z - 13)).toBeLessThan(2);
  });

  it('returns null when all segments are broken', () => {
    const w = createWorld();
    for (const s of w.fence.segments) s.broken = true;
    const seg = findNearestUnbrokenSegment(w, { x: 0, z: 0 });
    expect(seg).toBeNull();
  });

  it('approaching bear walks toward target segment', () => {
    const w = createWorld();
    const bear = spawnBear(w, { x: 20, z: 0 });
    bear.state = 'approaching';
    bear.target = w.fence.segments[0]; // arbitrary target
    const distBefore = Math.hypot(bear.pos.x - bear.target.pos.x, bear.pos.z - bear.target.pos.z);
    updateBear(w, 0.5);
    const distAfter = Math.hypot(bear.pos.x - bear.target.pos.x, bear.pos.z - bear.target.pos.z);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('approaching → attacking-fence when within attackRange of target', () => {
    const w = createWorld();
    const seg = w.fence.segments[0];
    const bear = spawnBear(w, { x: seg.pos.x + 1.0, z: seg.pos.z });
    bear.state = 'approaching';
    bear.target = seg;
    updateBear(w, 0.016);
    expect(bear.state).toBe('attacking-fence');
  });
});

describe('bear AI — attacking-fence', () => {
  it('damages target segment every attackCD seconds', () => {
    const w = createWorld();
    const seg = w.fence.segments[0];
    const bear = spawnBear(w, { x: seg.pos.x + 0.5, z: seg.pos.z });
    bear.state = 'attacking-fence';
    bear.target = seg;
    bear.attackCD = 0;
    const startHp = seg.hp;
    updateBear(w, 0.016); // first frame: attack lands, CD set
    expect(seg.hp).toBe(startHp - BALANCE.bear.damageFenceBase);
    // Wait less than CD — no further damage
    updateBear(w, 0.5);
    expect(seg.hp).toBe(startHp - BALANCE.bear.damageFenceBase);
    // Wait more (total > attackCD) — second hit
    updateBear(w, BALANCE.bear.attackCD);
    expect(seg.hp).toBe(startHp - BALANCE.bear.damageFenceBase * 2);
  });

  it('attacking-fence → through when target becomes broken', () => {
    const w = createWorld();
    const seg = w.fence.segments[0];
    seg.hp = 5; // about to break
    const bear = spawnBear(w, { x: seg.pos.x + 0.5, z: seg.pos.z });
    bear.state = 'attacking-fence';
    bear.target = seg;
    bear.attackCD = 0;
    updateBear(w, 0.016);
    expect(seg.broken).toBe(true);
    expect(bear.state).toBe('through');
    expect(bear.target).toBeNull();
  });
});

describe('bear AI — through', () => {
  it('walks toward player when through', () => {
    const w = createWorld();
    const bear = spawnBear(w, { x: 8, z: 8 });
    bear.state = 'through';
    w.player.pos = { x: 0, y: 0, z: 0 };
    const distBefore = Math.hypot(bear.pos.x, bear.pos.z);
    updateBear(w, 0.5);
    const distAfter = Math.hypot(bear.pos.x, bear.pos.z);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('through → attacking-player when within attackRange of player', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    const bear = spawnBear(w, { x: 1.0, z: 0 });
    bear.state = 'through';
    updateBear(w, 0.016);
    expect(bear.state).toBe('attacking-player');
  });
});
