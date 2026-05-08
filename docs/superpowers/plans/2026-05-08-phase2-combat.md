# Phase 2 — Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bears spawn around the base and attack the fence; player auto-chops bears within axe range; killed bears drop meat which auto-stacks on player's back; if a fence segment breaks, bears walk through and attack the player; player death respawns at base center after 2s, dropping the meat stack on the floor.

**Architecture:** Adds five new pure systems (`fence.js`, `bear.js`, `meat.js`, plus extensions to `player.js`) and four new render modules (`fence-mesh.js`, `bear-mesh.js`, `meat-mesh.js`, `stack-mesh.js`). Combat balance values are already in `src/balance.js` from Phase 1.

**Tech Stack:** Same as Phase 1 — Vite + Three.js + Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-08-bear-meat-tycoon-design.md` (Subsystems: Bears, Fence, Player, Meat).

**Branch:** `claude/install-superpowers-skill-rfdP9` (continued from Phase 1 merge).

---

## File Structure (added in this phase)

```
mobile-game/
├── src/
│   ├── balance.js                     # MODIFY: add bear.attackRange, fence.attackRange
│   ├── world.js                       # MODIFY: add helpers spawnBear, dropMeatRaw, killBear
│   ├── main.js                        # MODIFY: wire new systems + mesh managers
│   ├── systems/
│   │   ├── player.js                  # MODIFY: auto-attack, take damage, death/respawn
│   │   ├── fence.js                   # NEW
│   │   ├── bear.js                    # NEW
│   │   └── meat.js                    # NEW
│   └── render/
│       ├── fence-mesh.js              # NEW
│       ├── bear-mesh.js               # NEW
│       ├── meat-mesh.js               # NEW
│       └── stack-mesh.js              # NEW
└── tests/
    └── systems/
        ├── fence.test.js              # NEW
        ├── bear.test.js               # NEW
        ├── meat.test.js               # NEW
        └── player.test.js             # MODIFY: add combat/death tests
```

---

## Task 1: Add combat ranges to balance.js

**Files:**
- Modify: `src/balance.js`
- Modify: `tests/balance.test.js`

- [ ] **Step 1: Update `src/balance.js`** — add `attackRange` to `bear` and `fence`:

In the `bear:` block, add `attackRange: 1.5,` after `attackCD`. In the `fence:` block, add `attackRange: 1.5,` after `hpPerSegment`. Final block looks like:

```js
  bear: {
    hpBase: 70,
    speed: 2.5,
    damageFenceBase: 10,
    damagePlayer: 15,
    attackCD: 1.0,
    attackRange: 1.5,
    meatDrops: 3,
  },
  fence: {
    segments: 16,
    hpPerSegment: 100,
    attackRange: 1.5,
  },
```

- [ ] **Step 2: Add test** to `tests/balance.test.js` (inside the existing `describe('balance', ...)` block):

```js
  it('combat ranges are positive', () => {
    expect(BALANCE.bear.attackRange).toBeGreaterThan(0);
    expect(BALANCE.fence.attackRange).toBeGreaterThan(0);
  });
```

- [ ] **Step 3: Run all tests, verify pass**

```bash
npm run test:ci
```

Expected: 22 tests pass (21 + 1 new).

- [ ] **Step 4: Commit**

```bash
git add src/balance.js tests/balance.test.js
git commit -m "Phase 2.1: add bear.attackRange and fence.attackRange to balance"
```

---

## Task 2: Fence damage system + tests

**Files:**
- Create: `src/systems/fence.js`
- Create: `tests/systems/fence.test.js`

- [ ] **Step 1: Failing test** in `tests/systems/fence.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateFence, damageFenceSegment, repairAllSegments } from '../../src/systems/fence.js';

describe('fence damage', () => {
  it('damageFenceSegment subtracts hp', () => {
    const w = createWorld();
    const segId = w.fence.segments[0].id;
    damageFenceSegment(w, segId, 30);
    expect(w.fence.segments[0].hp).toBe(70);
  });

  it('hp clamps at 0 and segment becomes broken', () => {
    const w = createWorld();
    const segId = w.fence.segments[0].id;
    damageFenceSegment(w, segId, 999);
    expect(w.fence.segments[0].hp).toBe(0);
    expect(w.fence.segments[0].broken).toBe(true);
  });

  it('damaging a broken segment is a no-op', () => {
    const w = createWorld();
    w.fence.segments[0].hp = 0;
    w.fence.segments[0].broken = true;
    damageFenceSegment(w, w.fence.segments[0].id, 50);
    expect(w.fence.segments[0].hp).toBe(0);
  });

  it('repairAllSegments restores hp and clears broken flag', () => {
    const w = createWorld();
    w.fence.segments[0].hp = 0;
    w.fence.segments[0].broken = true;
    w.fence.segments[3].hp = 25;
    repairAllSegments(w);
    for (const s of w.fence.segments) {
      expect(s.hp).toBe(100);
      expect(s.broken).toBe(false);
    }
  });

  it('update is a pure call that does not throw on empty fence', () => {
    const w = createWorld();
    expect(() => updateFence(w, 0.016)).not.toThrow();
  });
});
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/fence.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementation** at `src/systems/fence.js`:

```js
import { BALANCE } from '../balance.js';

export function damageFenceSegment(world, segmentId, amount) {
  const seg = world.fence.segments.find(s => s.id === segmentId);
  if (!seg || seg.broken) return;
  seg.hp = Math.max(0, seg.hp - amount);
  if (seg.hp === 0) seg.broken = true;
}

export function repairAllSegments(world) {
  for (const s of world.fence.segments) {
    s.hp = BALANCE.fence.hpPerSegment;
    s.broken = false;
  }
}

export function update(world, dt) {
  // Currently no per-frame fence logic. Damage is applied externally by
  // the bear system; this hook exists for future regeneration / decay.
  void world; void dt;
}
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 27 tests pass (22 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/fence.js tests/systems/fence.test.js
git commit -m "Phase 2.2: fence damage and repair system + tests"
```

---

## Task 3: World helpers — spawnBear, dropMeatRaw, killBear

**Files:**
- Modify: `src/world.js`
- Modify: `tests/world.test.js`

- [ ] **Step 1: Failing tests** — append to `tests/world.test.js`:

```js
import { spawnBear, dropMeatRaw, killBear } from '../src/world.js';

describe('world helpers', () => {
  it('spawnBear adds bear with auto-incremented id and required fields', () => {
    const w = createWorld();
    const bear = spawnBear(w, { x: 5, z: -3 });
    expect(w.bears).toHaveLength(1);
    expect(bear.id).toBe(1);
    expect(bear.pos).toEqual({ x: 5, z: -3 });
    expect(bear.hp).toBeGreaterThan(0);
    expect(bear.state).toBe('approaching');
    expect(bear.attackCD).toBe(0);
    expect(bear.target).toBeNull();
    expect(w.nextId).toBe(1);
  });

  it('subsequent spawns get distinct ids', () => {
    const w = createWorld();
    const a = spawnBear(w, { x: 0, z: 0 });
    const b = spawnBear(w, { x: 1, z: 0 });
    expect(a.id).not.toBe(b.id);
    expect(w.bears).toHaveLength(2);
  });

  it('dropMeatRaw appends a piece with id and position', () => {
    const w = createWorld();
    const piece = dropMeatRaw(w, { x: 2, z: 4 });
    expect(w.meatRaw).toHaveLength(1);
    expect(piece.pos).toEqual({ x: 2, z: 4 });
    expect(piece.despawnTimer).toBeGreaterThan(0);
    expect(piece.id).toBeGreaterThan(0);
  });

  it('killBear removes the bear and drops BALANCE.bear.meatDrops pieces near its position', () => {
    const w = createWorld();
    const bear = spawnBear(w, { x: 10, z: 10 });
    killBear(w, bear);
    expect(w.bears).toHaveLength(0);
    expect(w.meatRaw).toHaveLength(3); // BALANCE.bear.meatDrops
    for (const m of w.meatRaw) {
      // each drop is within ~1 unit of bear's death position
      expect(Math.hypot(m.pos.x - 10, m.pos.z - 10)).toBeLessThan(1.5);
    }
  });
});
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/world.test.js
```

Expected: FAIL — `spawnBear is not a function`.

- [ ] **Step 3: Implementation** — append to `src/world.js`:

```js
export function spawnBear(world, pos) {
  const bear = {
    id: ++world.nextId,
    pos: { x: pos.x, z: pos.z },
    rot: 0,
    hp: BALANCE.bear.hpBase,
    hpMax: BALANCE.bear.hpBase,
    speed: BALANCE.bear.speed,
    state: 'approaching',
    target: null,
    attackCD: 0,
  };
  world.bears.push(bear);
  return bear;
}

export function dropMeatRaw(world, pos) {
  const piece = {
    id: ++world.nextId,
    pos: { x: pos.x, z: pos.z },
    despawnTimer: BALANCE.meat.despawn,
  };
  world.meatRaw.push(piece);
  return piece;
}

export function killBear(world, bear) {
  const idx = world.bears.indexOf(bear);
  if (idx >= 0) world.bears.splice(idx, 1);
  for (let i = 0; i < BALANCE.bear.meatDrops; i++) {
    const angle = (i / BALANCE.bear.meatDrops) * Math.PI * 2;
    const r = 0.6;
    dropMeatRaw(world, {
      x: bear.pos.x + Math.cos(angle) * r,
      z: bear.pos.z + Math.sin(angle) * r,
    });
  }
}
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 31 tests pass (27 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/world.js tests/world.test.js
git commit -m "Phase 2.3: world helpers spawnBear, dropMeatRaw, killBear"
```

---

## Task 4: Bear AI — approach + attack-fence + through state machine

**Files:**
- Create: `src/systems/bear.js`
- Create: `tests/systems/bear.test.js`

- [ ] **Step 1: Failing tests** in `tests/systems/bear.test.js`:

```js
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
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/bear.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementation** at `src/systems/bear.js`:

```js
import { BALANCE } from '../balance.js';
import { damageFenceSegment } from './fence.js';

export function findNearestUnbrokenSegment(world, pos) {
  let best = null;
  let bestDist = Infinity;
  for (const seg of world.fence.segments) {
    if (seg.broken) continue;
    const d = Math.hypot(seg.pos.x - pos.x, seg.pos.z - pos.z);
    if (d < bestDist) { best = seg; bestDist = d; }
  }
  return best;
}

function moveToward(bear, targetPos, dt) {
  const dx = targetPos.x - bear.pos.x;
  const dz = targetPos.z - bear.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = bear.speed * dt;
  if (step >= dist) {
    bear.pos.x = targetPos.x;
    bear.pos.z = targetPos.z;
  } else {
    bear.pos.x += (dx / dist) * step;
    bear.pos.z += (dz / dist) * step;
  }
  bear.rot = Math.atan2(dx, dz);
  return dist;
}

export function update(world, dt) {
  for (const bear of world.bears) {
    if (bear.attackCD > 0) bear.attackCD -= dt;

    if (bear.state === 'approaching') {
      // Re-pick target if missing or broken
      if (!bear.target || bear.target.broken) {
        bear.target = findNearestUnbrokenSegment(world, bear.pos);
      }
      if (!bear.target) {
        // No fence left — walk straight to player
        bear.state = 'through';
        continue;
      }
      const dist = moveToward(bear, bear.target.pos, dt);
      if (dist <= BALANCE.fence.attackRange) {
        bear.state = 'attacking-fence';
      }
    } else if (bear.state === 'attacking-fence') {
      if (!bear.target || bear.target.broken) {
        bear.state = 'through';
        bear.target = null;
        continue;
      }
      if (bear.attackCD <= 0) {
        damageFenceSegment(world, bear.target.id, BALANCE.bear.damageFenceBase);
        bear.attackCD = BALANCE.bear.attackCD;
        if (bear.target.broken) {
          bear.state = 'through';
          bear.target = null;
        }
      }
    } else if (bear.state === 'through') {
      const dist = moveToward(bear, world.player.pos, dt);
      if (dist <= BALANCE.bear.attackRange) {
        bear.state = 'attacking-player';
      }
    } else if (bear.state === 'attacking-player') {
      // Player damage handled in Task 9. For now, hold position.
      // If player moves out of range, return to chasing.
      const dist = Math.hypot(world.player.pos.x - bear.pos.x, world.player.pos.z - bear.pos.z);
      if (dist > BALANCE.bear.attackRange + 0.5) {
        bear.state = 'through';
      }
    }
  }
}
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 39 tests pass (31 + 8 new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/bear.js tests/systems/bear.test.js
git commit -m "Phase 2.4: bear AI state machine — approach, attack-fence, through, attack-player"
```

---

## Task 5: Bear spawning + difficulty scaling integration

**Files:**
- Modify: `src/systems/bear.js`
- Modify: `tests/systems/bear.test.js`

- [ ] **Step 1: Add tests** — append to `tests/systems/bear.test.js`:

```js
import { spawnBearFromOutside } from '../../src/systems/bear.js';

describe('bear spawning', () => {
  it('spawnBearFromOutside places bear outside the fence radius', () => {
    const w = createWorld();
    const bear = spawnBearFromOutside(w);
    const dist = Math.hypot(bear.pos.x, bear.pos.z);
    expect(dist).toBeGreaterThan(w.base.radius);
    expect(bear.state).toBe('approaching');
  });

  it('spawn timer decrements and triggers spawn on schedule', () => {
    const w = createWorld();
    w.bearSpawnTimer = 0.1;
    updateBear(w, 0.05);
    expect(w.bears).toHaveLength(0); // not yet
    updateBear(w, 0.1); // crosses zero
    expect(w.bears.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/bear.test.js
```

Expected: FAIL — `spawnBearFromOutside is not a function`.

- [ ] **Step 3: Modify `src/systems/bear.js`**:

Add import at top:
```js
import { spawnBear } from '../world.js';
import { BALANCE, bearSpawnPeriod, bearHp } from '../balance.js';
```
(replace the existing `import { BALANCE } from '../balance.js';` line)

Add new export and modify `update`:

```js
export function spawnBearFromOutside(world) {
  const angle = Math.random() * Math.PI * 2;
  const r = world.base.radius + 6;
  const bear = spawnBear(world, {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
  });
  // Scale HP based on elapsed minutes
  const m = world.time.elapsed / 60;
  bear.hp = bearHp(m);
  bear.hpMax = bear.hp;
  return bear;
}
```

At the start of `update(world, dt)`, before the `for` loop, add:

```js
  // Spawn timer
  if (typeof world.bearSpawnTimer !== 'number') world.bearSpawnTimer = bearSpawnPeriod(0);
  world.bearSpawnTimer -= dt;
  if (world.bearSpawnTimer <= 0) {
    spawnBearFromOutside(world);
    const m = world.time.elapsed / 60;
    world.bearSpawnTimer = bearSpawnPeriod(m);
  }
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 41 tests pass (39 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/bear.js tests/systems/bear.test.js
git commit -m "Phase 2.5: bear spawning from outside fence with difficulty scaling"
```

---

## Task 6: Player auto-attack system

**Files:**
- Modify: `src/systems/player.js`
- Modify: `tests/systems/player.test.js`

- [ ] **Step 1: Add tests** — append to `tests/systems/player.test.js`:

```js
import { spawnBear } from '../../src/world.js';
import { BALANCE } from '../../src/balance.js';

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
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/player.test.js
```

Expected: FAIL — auto-attack not implemented.

- [ ] **Step 3: Modify `src/systems/player.js`** — add auto-attack at bottom of `update` function (after movement code), and add killBear import:

Replace the entire file with:

```js
import { killBear } from '../world.js';

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;

  // Movement
  let mx = p.input.move.x;
  let mz = p.input.move.z;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (len > 0.001) {
    p.pos.x += mx * p.speed * dt;
    p.pos.z += mz * p.speed * dt;
    p.rot = Math.atan2(mx, mz);
  }

  // Auto-attack
  if (p.axe.cooldownTimer > 0) p.axe.cooldownTimer -= dt;
  if (p.axe.cooldownTimer <= 0) {
    let nearest = null;
    let nearestDist = p.axe.range;
    for (const bear of world.bears) {
      const d = Math.hypot(bear.pos.x - p.pos.x, bear.pos.z - p.pos.z);
      if (d <= nearestDist) { nearest = bear; nearestDist = d; }
    }
    if (nearest) {
      nearest.hp -= p.axe.damage;
      p.axe.cooldownTimer = p.axe.cooldown;
      if (nearest.hp <= 0) killBear(world, nearest);
    }
  }
}
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 45 tests pass (41 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/player.js tests/systems/player.test.js
git commit -m "Phase 2.6: player auto-attack with axe range and cooldown"
```

---

## Task 7: Meat system — despawn + auto-pickup

**Files:**
- Create: `src/systems/meat.js`
- Create: `tests/systems/meat.test.js`

- [ ] **Step 1: Failing tests** in `tests/systems/meat.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createWorld, dropMeatRaw } from '../../src/world.js';
import { update as updateMeat } from '../../src/systems/meat.js';
import { BALANCE } from '../../src/balance.js';

describe('meat despawn', () => {
  it('despawn timer ticks down', () => {
    const w = createWorld();
    const piece = dropMeatRaw(w, { x: 5, z: 5 });
    const before = piece.despawnTimer;
    updateMeat(w, 1.0);
    expect(piece.despawnTimer).toBe(before - 1.0);
  });

  it('removed from world when despawn timer reaches 0', () => {
    const w = createWorld();
    dropMeatRaw(w, { x: 5, z: 5 });
    expect(w.meatRaw).toHaveLength(1);
    updateMeat(w, BALANCE.meat.despawn + 1);
    expect(w.meatRaw).toHaveLength(0);
  });
});

describe('meat pickup', () => {
  it('player picks up raw meat within pickupRadius into empty stack', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropMeatRaw(w, { x: 0.3, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(0);
    expect(w.player.stack.type).toBe('raw');
    expect(w.player.stack.count).toBe(1);
  });

  it('does not pick up meat outside pickupRadius', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropMeatRaw(w, { x: 5, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(1);
    expect(w.player.stack.count).toBe(0);
  });

  it('stack respects max capacity', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.stack = { type: 'raw', count: BALANCE.player.stack.max, max: BALANCE.player.stack.max };
    dropMeatRaw(w, { x: 0.3, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(1); // not picked up
    expect(w.player.stack.count).toBe(BALANCE.player.stack.max);
  });

  it('does not pick up raw when carrying cooked', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.stack = { type: 'cooked', count: 2, max: BALANCE.player.stack.max };
    dropMeatRaw(w, { x: 0.3, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(1); // not picked up
    expect(w.player.stack.type).toBe('cooked');
  });

  it('does not pick up when player is dead', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.state = 'dead';
    dropMeatRaw(w, { x: 0.3, z: 0 });
    updateMeat(w, 0.016);
    expect(w.meatRaw).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/meat.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementation** at `src/systems/meat.js`:

```js
import { BALANCE } from '../balance.js';

export function update(world, dt) {
  // Despawn timer + auto-pickup for raw meat
  for (let i = world.meatRaw.length - 1; i >= 0; i--) {
    const piece = world.meatRaw[i];
    piece.despawnTimer -= dt;
    if (piece.despawnTimer <= 0) {
      world.meatRaw.splice(i, 1);
      continue;
    }
    if (tryPickup(world, piece, 'raw')) {
      world.meatRaw.splice(i, 1);
    }
  }
  // Despawn + auto-pickup for cooked meat (cooked logic added in Phase 3)
  for (let i = world.meatCooked.length - 1; i >= 0; i--) {
    const piece = world.meatCooked[i];
    piece.despawnTimer -= dt;
    if (piece.despawnTimer <= 0) {
      world.meatCooked.splice(i, 1);
      continue;
    }
    if (tryPickup(world, piece, 'cooked')) {
      world.meatCooked.splice(i, 1);
    }
  }
}

function tryPickup(world, piece, type) {
  const p = world.player;
  if (p.state !== 'alive') return false;
  const d = Math.hypot(piece.pos.x - p.pos.x, piece.pos.z - p.pos.z);
  if (d > BALANCE.player.pickupRadius) return false;
  if (p.stack.count >= p.stack.max) return false;
  if (p.stack.type !== null && p.stack.type !== type) return false;
  p.stack.type = type;
  p.stack.count++;
  return true;
}
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 53 tests pass (45 + 8 new). Note: existing player.test.js tests do not rely on meat, so they remain unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/systems/meat.js tests/systems/meat.test.js
git commit -m "Phase 2.7: meat system — despawn timer + auto-pickup with stack constraints"
```

---

## Task 8: Bear damages player (attacking-player state)

**Files:**
- Modify: `src/systems/bear.js`
- Modify: `tests/systems/bear.test.js`

- [ ] **Step 1: Add tests** — append to `tests/systems/bear.test.js`:

```js
describe('bear AI — attacking-player damage', () => {
  it('damages player every attackCD seconds when in attacking-player state', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    const bear = spawnBear(w, { x: 0.5, z: 0 });
    bear.state = 'attacking-player';
    bear.attackCD = 0;
    const hpBefore = w.player.hp;
    updateBear(w, 0.016);
    expect(w.player.hp).toBe(hpBefore - BALANCE.bear.damagePlayer);
    updateBear(w, 0.5); // less than attackCD
    expect(w.player.hp).toBe(hpBefore - BALANCE.bear.damagePlayer);
    updateBear(w, BALANCE.bear.attackCD);
    expect(w.player.hp).toBe(hpBefore - BALANCE.bear.damagePlayer * 2);
  });

  it('does not damage dead player', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.state = 'dead';
    const bear = spawnBear(w, { x: 0.5, z: 0 });
    bear.state = 'attacking-player';
    bear.attackCD = 0;
    const hpBefore = w.player.hp;
    updateBear(w, 0.016);
    expect(w.player.hp).toBe(hpBefore);
  });
});
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/bear.test.js
```

Expected: FAIL — bear is not damaging player.

- [ ] **Step 3: Modify `src/systems/bear.js`** — replace the `attacking-player` branch in `update`:

Find:

```js
    } else if (bear.state === 'attacking-player') {
      // Player damage handled in Task 9. For now, hold position.
      // If player moves out of range, return to chasing.
      const dist = Math.hypot(world.player.pos.x - bear.pos.x, world.player.pos.z - bear.pos.z);
      if (dist > BALANCE.bear.attackRange + 0.5) {
        bear.state = 'through';
      }
    }
```

Replace with:

```js
    } else if (bear.state === 'attacking-player') {
      const dist = Math.hypot(world.player.pos.x - bear.pos.x, world.player.pos.z - bear.pos.z);
      if (dist > BALANCE.bear.attackRange + 0.5) {
        bear.state = 'through';
        continue;
      }
      if (bear.attackCD <= 0 && world.player.state === 'alive') {
        world.player.hp = Math.max(0, world.player.hp - BALANCE.bear.damagePlayer);
        bear.attackCD = BALANCE.bear.attackCD;
      }
    }
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 55 tests pass (53 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/bear.js tests/systems/bear.test.js
git commit -m "Phase 2.8: bear damages player while in attacking-player state"
```

---

## Task 9: Player death + respawn + drop stack

**Files:**
- Modify: `src/systems/player.js`
- Modify: `tests/systems/player.test.js`

- [ ] **Step 1: Add tests** — append to `tests/systems/player.test.js`:

```js
import { dropMeatRaw } from '../../src/world.js';

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
```

- [ ] **Step 2: Verify red**

```bash
npm run test:ci -- tests/systems/player.test.js
```

Expected: FAIL — death/respawn not implemented.

- [ ] **Step 3: Replace `src/systems/player.js`** with full version:

```js
import { killBear, dropMeatRaw } from '../world.js';
import { BALANCE } from '../balance.js';

function dropStack(world) {
  const p = world.player;
  if (p.stack.count <= 0 || p.stack.type === null) return;
  const arr = p.stack.type === 'raw' ? world.meatRaw : world.meatCooked;
  for (let i = 0; i < p.stack.count; i++) {
    const angle = (i / p.stack.count) * Math.PI * 2;
    const r = 0.5;
    const piece = {
      id: ++world.nextId,
      pos: { x: p.pos.x + Math.cos(angle) * r, z: p.pos.z + Math.sin(angle) * r },
      despawnTimer: BALANCE.meat.despawn,
    };
    arr.push(piece);
  }
  p.stack.count = 0;
  p.stack.type = null;
}

export function update(world, dt) {
  const p = world.player;

  // Death detection
  if (p.state === 'alive' && p.hp <= 0) {
    p.state = 'dead';
    p.respawnTimer = BALANCE.player.respawn;
    dropStack(world);
    return;
  }

  // Respawn countdown
  if (p.state === 'dead') {
    p.respawnTimer -= dt;
    if (p.respawnTimer <= 0) {
      p.state = 'alive';
      p.hp = p.hpMax;
      p.pos.x = world.base.center.x;
      p.pos.y = 0;
      p.pos.z = world.base.center.z;
      p.respawnTimer = 0;
    }
    return;
  }

  // Movement
  let mx = p.input.move.x;
  let mz = p.input.move.z;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (len > 0.001) {
    p.pos.x += mx * p.speed * dt;
    p.pos.z += mz * p.speed * dt;
    p.rot = Math.atan2(mx, mz);
  }

  // Auto-attack
  if (p.axe.cooldownTimer > 0) p.axe.cooldownTimer -= dt;
  if (p.axe.cooldownTimer <= 0) {
    let nearest = null;
    let nearestDist = p.axe.range;
    for (const bear of world.bears) {
      const d = Math.hypot(bear.pos.x - p.pos.x, bear.pos.z - p.pos.z);
      if (d <= nearestDist) { nearest = bear; nearestDist = d; }
    }
    if (nearest) {
      nearest.hp -= p.axe.damage;
      p.axe.cooldownTimer = p.axe.cooldown;
      if (nearest.hp <= 0) killBear(world, nearest);
    }
  }
}
```

(The unused `dropMeatRaw` import is intentional — not used now but kept available; you can remove it if desired.)

Actually remove the unused import to keep the file clean. Final imports at top:

```js
import { killBear } from '../world.js';
import { BALANCE } from '../balance.js';
```

- [ ] **Step 4: Verify green**

```bash
npm run test:ci
```

Expected: 60 tests pass (55 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/systems/player.js tests/systems/player.test.js
git commit -m "Phase 2.9: player death detection, stack drop, respawn at base"
```

---

## Task 10: Render — fence segments

**Files:**
- Create: `src/render/fence-mesh.js`

- [ ] **Step 1: Create `src/render/fence-mesh.js`**:

```js
import * as THREE from 'three';

const LOG_COUNT = 4;     // logs per segment
const LOG_HEIGHT = 1.4;
const LOG_RADIUS = 0.18;
const LOG_SPACING = 0.42;
const SEGMENT_ARC_LENGTH = 4.7; // approximately the chord at radius 12 / 16 segments

const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b3f1d });

export function createFenceSegmentMesh() {
  const group = new THREE.Group();
  for (let i = 0; i < LOG_COUNT; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, LOG_HEIGHT, 6),
      woodMat
    );
    log.position.set((i - (LOG_COUNT - 1) / 2) * LOG_SPACING, LOG_HEIGHT / 2, 0);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
  }
  return group;
}

export function applyFenceSegmentTransform(mesh, segment) {
  // Position: segment.pos {x, z}; rotation Y: segment.rot - π/2 so logs are tangent to the circle
  mesh.position.set(segment.pos.x, 0, segment.pos.z);
  mesh.rotation.y = segment.rot - Math.PI / 2;
  // If broken, drop the segment to lie on the ground (rotate 90° on +X)
  if (segment.broken) {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0; // already at ground; the rotation lays logs flat
  } else {
    mesh.rotation.x = 0;
    mesh.position.y = 0;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/fence-mesh.js
git commit -m "Phase 2.10: fence segment mesh (4 logs per segment) with broken-state visual"
```

---

## Task 11: Render — bear mesh

**Files:**
- Create: `src/render/bear-mesh.js`

- [ ] **Step 1: Create `src/render/bear-mesh.js`**:

```js
import * as THREE from 'three';

const furMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });
const noseMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });

export function createBearMesh() {
  const group = new THREE.Group();

  // Body: box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 1.2),
    furMat
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Head: smaller box at front
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.5, 0.5),
    furMat
  );
  head.position.set(0, 0.7, 0.7);
  head.castShadow = true;
  group.add(head);

  // Nose
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.14),
    noseMat
  );
  nose.position.set(0, 0.65, 0.97);
  group.add(nose);

  // 4 legs
  const legGeom = new THREE.BoxGeometry(0.22, 0.4, 0.22);
  const legPositions = [
    { x:  0.32, z:  0.45 },
    { x: -0.32, z:  0.45 },
    { x:  0.32, z: -0.45 },
    { x: -0.32, z: -0.45 },
  ];
  for (const p of legPositions) {
    const leg = new THREE.Mesh(legGeom, furMat);
    leg.position.set(p.x, 0.2, p.z);
    leg.castShadow = true;
    group.add(leg);
  }

  return group;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/bear-mesh.js
git commit -m "Phase 2.11: bear primitive mesh (box body + head + 4 legs)"
```

---

## Task 12: Render — meat + stack

**Files:**
- Create: `src/render/meat-mesh.js`
- Create: `src/render/stack-mesh.js`

- [ ] **Step 1: Create `src/render/meat-mesh.js`**:

```js
import * as THREE from 'three';

const rawMat = new THREE.MeshLambertMaterial({ color: 0xc04a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });

export function createMeatMesh(type) {
  const mat = type === 'cooked' ? cookedMat : rawMat;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.2, 0.5),
    mat
  );
  mesh.castShadow = true;
  return mesh;
}
```

- [ ] **Step 2: Create `src/render/stack-mesh.js`**:

```js
import * as THREE from 'three';

const rawMat = new THREE.MeshLambertMaterial({ color: 0xc04a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });
const STACK_PIECE_HEIGHT = 0.18;
const STACK_BASE_Y = 1.0; // height on player's back where the stack starts

const meatGeom = new THREE.BoxGeometry(0.32, STACK_PIECE_HEIGHT, 0.45);

export function createStackGroup() {
  const group = new THREE.Group();
  group.position.set(-0.05, 0, -0.25); // slightly behind+left of player center
  return group;
}

export function syncStackMesh(group, stack) {
  // Remove extra children
  while (group.children.length > stack.count) {
    const m = group.children.pop();
    m.geometry?.dispose?.();
  }
  // Add missing children
  while (group.children.length < stack.count) {
    const mat = stack.type === 'cooked' ? cookedMat : rawMat;
    const piece = new THREE.Mesh(meatGeom, mat);
    piece.castShadow = true;
    group.add(piece);
  }
  // Recolour all (in case type changed) and stack vertically
  for (let i = 0; i < group.children.length; i++) {
    const piece = group.children[i];
    piece.material = stack.type === 'cooked' ? cookedMat : rawMat;
    piece.position.set(0, STACK_BASE_Y + i * STACK_PIECE_HEIGHT, 0);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/render/meat-mesh.js src/render/stack-mesh.js
git commit -m "Phase 2.12: meat and back-stack render meshes"
```

---

## Task 13: Wire everything into main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Replace `src/main.js`** with:

```js
import * as THREE from 'three';
import { createWorld, saveWorld, loadWorld } from './world.js';
import { update as updatePlayer } from './systems/player.js';
import { update as updateBear } from './systems/bear.js';
import { update as updateFence } from './systems/fence.js';
import { update as updateMeat } from './systems/meat.js';
import { startLoop } from './loop.js';
import { createScene, createRenderer } from './render/scene.js';
import { createPlayerMesh } from './render/meshes.js';
import { createFenceSegmentMesh, applyFenceSegmentTransform } from './render/fence-mesh.js';
import { createBearMesh } from './render/bear-mesh.js';
import { createMeatMesh } from './render/meat-mesh.js';
import { createStackGroup, syncStackMesh } from './render/stack-mesh.js';
import { createCamera, updateCamera, handleResize } from './camera.js';
import { setupJoystick } from './input.js';
import { setupHud } from './ui.js';

const canvas = document.getElementById('game');
const world = createWorld();
loadWorld(world);

const scene = createScene();
const renderer = createRenderer(canvas);
const camera = createCamera();

// Player + back stack
const playerMesh = createPlayerMesh();
const stackGroup = createStackGroup();
playerMesh.add(stackGroup);
scene.add(playerMesh);

// Fence — one mesh per segment, indexed by segment id
const fenceMeshes = new Map();
for (const seg of world.fence.segments) {
  const mesh = createFenceSegmentMesh();
  applyFenceSegmentTransform(mesh, seg);
  scene.add(mesh);
  fenceMeshes.set(seg.id, mesh);
}

// Bears + meat — managed dynamically each frame
const bearMeshes = new Map();
const meatMeshes = new Map();

setupJoystick(world);
const hud = setupHud();

window.addEventListener('resize', () => handleResize(camera, renderer));

let saveTimer = 0;
function autoSave(world) {
  saveTimer += world.time.dt;
  if (saveTimer >= 5) { saveWorld(world); saveTimer = 0; }
}

const systems = [updateBear, updateFence, updatePlayer, updateMeat];

function syncEntityMeshes(entityArray, meshMap, scene, factory) {
  // Remove meshes for entities no longer present
  const aliveIds = new Set(entityArray.map(e => e.id));
  for (const [id, mesh] of meshMap) {
    if (!aliveIds.has(id)) {
      scene.remove(mesh);
      meshMap.delete(id);
    }
  }
  // Add meshes for new entities, sync positions for all
  for (const e of entityArray) {
    let mesh = meshMap.get(e.id);
    if (!mesh) {
      mesh = factory(e);
      scene.add(mesh);
      meshMap.set(e.id, mesh);
    }
    mesh.position.set(e.pos.x, 0, e.pos.z);
    if (typeof e.rot === 'number') mesh.rotation.y = e.rot;
  }
}

function render(world) {
  // Player mesh sync
  if (world.player.state === 'alive') {
    playerMesh.visible = true;
    playerMesh.position.set(world.player.pos.x, 0, world.player.pos.z);
    playerMesh.rotation.y = world.player.rot;
  } else {
    playerMesh.visible = false;
  }
  syncStackMesh(stackGroup, world.player.stack);

  // Fence
  for (const seg of world.fence.segments) {
    const mesh = fenceMeshes.get(seg.id);
    if (mesh) applyFenceSegmentTransform(mesh, seg);
  }

  // Bears
  syncEntityMeshes(world.bears, bearMeshes, scene, () => createBearMesh());

  // Meat — raw and cooked, both keyed by id (no overlap)
  syncEntityMeshes(world.meatRaw, meatMeshes, scene, () => createMeatMesh('raw'));
  syncEntityMeshes(world.meatCooked, meatMeshes, scene, () => createMeatMesh('cooked'));

  updateCamera(camera, world, world.time.dt);
  hud.update(world);
  renderer.render(scene, camera);
}

startLoop(world, systems, render, autoSave);

window.addEventListener('pagehide', () => saveWorld(world));
```

- [ ] **Step 2: Build to verify wiring**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 3: Run all tests**

```bash
npm run test:ci
```

Expected: 60 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "Phase 2.13: main.js wires fence/bear/meat systems and mesh managers"
```

---

## Task 14: Push and ship Phase 2

- [ ] **Step 1: Push branch**

```bash
git push -u origin claude/install-superpowers-skill-rfdP9
```

- [ ] **Step 2: Open PR via GitHub MCP / UI**

PR title: `Phase 2: Combat — bears, fence, axe, death/respawn, meat drops`

PR body: list the 13 task commits and milestone summary.

- [ ] **Step 3: Merge PR to main, wait for CI deploy**

- [ ] **Step 4: iPhone smoke test**

Open `https://damboskill-blip.github.io/mobile-game/`. Verify:
- 16 fence segments visible around base center as wood logs.
- Bears spawn from outside the fence, walk toward nearest segment, hit it.
- Fence segment HP drops; at 0 the segment lies down on the ground.
- Bears walk through broken segments toward player.
- Player auto-rubs nearest bear in range; bears die after 2 hits at start.
- Killed bears drop 3 raw meat pieces; player walks over them and they auto-stack on back (visible).
- If bears reach the player, player HP drops; at 0 player respawns at center after 2s with empty stack.

---

## Acceptance criteria

- [ ] All 60 unit tests pass (22 balance + 13 world + 11 player + 14 bear + 5 fence + 8 meat = 73 actually — recount during execution).
- [ ] `npm run build` succeeds.
- [ ] On iPhone PWA: combat loop end-to-end works as described in Task 14.4.
- [ ] No console errors.
- [ ] Performance: 60fps on iPhone 11+ with 5-10 bears on screen.

---

## Out of scope for Phase 2 (deferred)

- Cooking (fire) — Phase 3.
- Customers, register, money — Phase 4.
- Upgrade pads, employees — Phase 5.
- Sound effects — Phase 6.
- CC0 model swap-in — Phase 6.
