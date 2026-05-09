# Phase 3 — Production (Fire + Cooking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Игрок несёт стопку raw мяса к костру → стопка автоматически переливается в очередь готовки на костре → каждый кусок жарится `cookTimer` секунд → cooked-кусок выпадает на пол рядом с костром → игрок подбирает cooked в стопку (механика подбора уже реализована в Phase 2).

**Architecture:** Один новый pure-system `src/systems/fire.js`, расширение `src/systems/player.js` для transfer raw→fire, новый render-модуль `src/render/fire-mesh.js`. Костёр размещается в фиксированной точке внутри базы.

**Tech Stack:** Без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-05-08-bear-meat-tycoon-design.md` секции Meat & Fire, Player.

**Branch:** `claude/install-superpowers-skill-rfdP9`.

---

## File structure (added/modified)

```
mobile-game/
├── src/
│   ├── balance.js                    # MODIFY: add fire.transferRange (1.5)
│   ├── world.js                      # MODIFY: place fire at fixed pos (3, 0, -3) in createWorld
│   ├── main.js                       # MODIFY: wire fire system + fire-mesh
│   ├── systems/
│   │   ├── fire.js                   # NEW
│   │   └── player.js                 # MODIFY: transfer raw stack into fire on proximity
│   └── render/
│       └── fire-mesh.js              # NEW
└── tests/
    └── systems/
        ├── fire.test.js              # NEW
        └── player.test.js            # MODIFY: add transfer-on-fire-proximity tests
```

---

## Task 1: Balance + world fire placement

**Files:** `src/balance.js`, `src/world.js`, `tests/balance.test.js`, `tests/world.test.js`

- [ ] **Step 1:** In `src/balance.js`, in `fire:` block add a new line `transferRange: 1.5,` after `cookTimer: 2.0,`. Final block:

```js
  fire: {
    capacity: 5,
    cookTimer: 2.0,
    transferRange: 1.5,
  },
```

- [ ] **Step 2:** In `src/world.js`, modify the `fire:` field in the object returned by `createWorld()`. Change:

```js
    fire: { pos: null, cooking: [], capacity: BALANCE.fire.capacity },
```

to:

```js
    fire: { pos: { x: 3, z: -3 }, cooking: [], capacity: BALANCE.fire.capacity },
```

- [ ] **Step 3:** Update test in `tests/world.test.js`. The shape test currently doesn't check `fire`, but the createWorld test needs no change (no fire assertion). Add a new test inside `describe('createWorld', ...)`:

```js
  it('fire is placed at a valid position inside the base', () => {
    const w = createWorld();
    expect(w.fire.pos).not.toBeNull();
    expect(typeof w.fire.pos.x).toBe('number');
    expect(typeof w.fire.pos.z).toBe('number');
    const distFromCenter = Math.hypot(w.fire.pos.x, w.fire.pos.z);
    expect(distFromCenter).toBeLessThan(w.base.radius);
  });
```

- [ ] **Step 4:** Add test in `tests/balance.test.js` inside `describe('balance', ...)`:

```js
  it('fire.transferRange is positive', () => {
    expect(BALANCE.fire.transferRange).toBeGreaterThan(0);
  });
```

- [ ] **Step 5:** Run tests, verify all pass.

```bash
npm run test:ci
```

Expected: 66 tests pass (64 + 2 new).

- [ ] **Step 6:** Commit.

```bash
git add src/balance.js src/world.js tests/balance.test.js tests/world.test.js
git commit -m "Phase 3.1: place fire at (3, -3) inside base, add transferRange"
```

---

## Task 2: Fire system — cookTimer tick + spawn cooked

**Files:** `src/systems/fire.js`, `tests/systems/fire.test.js`

- [ ] **Step 1:** Failing tests at `tests/systems/fire.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateFire } from '../../src/systems/fire.js';
import { BALANCE } from '../../src/balance.js';

describe('fire cooking', () => {
  it('cookTimer ticks down for each piece in cooking[]', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: BALANCE.fire.cookTimer });
    const before = w.fire.cooking[0].timer;
    updateFire(w, 0.5);
    expect(w.fire.cooking[0].timer).toBeCloseTo(before - 0.5, 5);
  });

  it('removes piece from cooking and spawns cooked on ground when timer reaches 0', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    expect(w.fire.cooking).toHaveLength(0);
    expect(w.meatCooked).toHaveLength(1);
  });

  it('cooked spawn position is near fire pos within ~1 unit', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    const cooked = w.meatCooked[0];
    const dist = Math.hypot(cooked.pos.x - w.fire.pos.x, cooked.pos.z - w.fire.pos.z);
    expect(dist).toBeLessThanOrEqual(1.2);
    expect(dist).toBeGreaterThan(0.3);
  });

  it('processes multiple pieces in same frame', () => {
    const w = createWorld();
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    w.fire.cooking.push({ id: ++w.nextId, timer: 0.05 });
    updateFire(w, 0.1);
    expect(w.meatCooked).toHaveLength(2);
    expect(w.fire.cooking).toHaveLength(0);
  });

  it('does nothing when cooking[] is empty', () => {
    const w = createWorld();
    expect(() => updateFire(w, 0.016)).not.toThrow();
  });
});
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/fire.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3:** Implementation at `src/systems/fire.js`:

```js
import { BALANCE } from '../balance.js';

export function update(world, dt) {
  if (!world.fire.pos) return;
  // Tick each cooking piece's timer; on completion, spawn cooked on ground in arc around fire.
  for (let i = world.fire.cooking.length - 1; i >= 0; i--) {
    const piece = world.fire.cooking[i];
    piece.timer -= dt;
    if (piece.timer <= 0) {
      world.fire.cooking.splice(i, 1);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.4; // 0.7..1.1 from fire centre
      world.meatCooked.push({
        id: ++world.nextId,
        pos: {
          x: world.fire.pos.x + Math.cos(angle) * r,
          z: world.fire.pos.z + Math.sin(angle) * r,
        },
        despawnTimer: BALANCE.meat.despawn,
      });
    }
  }
}
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 71 tests pass (66 + 5 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/fire.js tests/systems/fire.test.js
git commit -m "Phase 3.2: fire cooking system — cookTimer tick + spawn cooked on ground"
```

---

## Task 3: Player transfers raw stack to fire on proximity

**Files:** `src/systems/player.js`, `tests/systems/player.test.js`

- [ ] **Step 1:** Failing tests — append to `tests/systems/player.test.js`:

```js
describe('player → fire transfer', () => {
  it('transfers raw stack onto fire.cooking when within transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { type: 'raw', count: 3, max: BALANCE.player.stack.max };
    updatePlayer(w, 0.016);
    // Up to fire.capacity pieces transfer (3 raw → fits in capacity 5)
    expect(w.fire.cooking).toHaveLength(3);
    expect(w.player.stack.count).toBe(0);
    expect(w.player.stack.type).toBeNull();
  });

  it('transfers only what fits in fire capacity, leaving remainder in stack', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { type: 'raw', count: 8, max: BALANCE.player.stack.max };
    // Pre-fill fire to leave only 2 capacity slots
    for (let i = 0; i < 3; i++) {
      w.fire.cooking.push({ id: ++w.nextId, timer: BALANCE.fire.cookTimer });
    }
    updatePlayer(w, 0.016);
    expect(w.fire.cooking).toHaveLength(BALANCE.fire.capacity); // full
    expect(w.player.stack.count).toBe(8 - (BALANCE.fire.capacity - 3));
    expect(w.player.stack.type).toBe('raw'); // still has raw left
  });

  it('does not transfer cooked meat to fire', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { type: 'cooked', count: 3, max: BALANCE.player.stack.max };
    updatePlayer(w, 0.016);
    expect(w.fire.cooking).toHaveLength(0);
    expect(w.player.stack.count).toBe(3);
  });

  it('does not transfer when player is outside transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 5, y: 0, z: w.fire.pos.z };
    w.player.stack = { type: 'raw', count: 2, max: BALANCE.player.stack.max };
    updatePlayer(w, 0.016);
    expect(w.fire.cooking).toHaveLength(0);
    expect(w.player.stack.count).toBe(2);
  });

  it('newly-transferred pieces start with full cookTimer', () => {
    const w = createWorld();
    w.player.pos = { x: w.fire.pos.x + 0.5, y: 0, z: w.fire.pos.z };
    w.player.stack = { type: 'raw', count: 1, max: BALANCE.player.stack.max };
    updatePlayer(w, 0.016);
    expect(w.fire.cooking[0].timer).toBe(BALANCE.fire.cookTimer);
  });
});
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/player.test.js
```

Expected: FAIL — fire.cooking remains empty.

- [ ] **Step 3:** Modify `src/systems/player.js`. Add a new helper at the top of the file (after imports), and call it within `update`:

After the existing imports, add:

```js
function tryTransferStackToFire(world) {
  const p = world.player;
  if (!world.fire.pos) return;
  if (p.stack.type !== 'raw' || p.stack.count <= 0) return;
  const dx = world.fire.pos.x - p.pos.x;
  const dz = world.fire.pos.z - p.pos.z;
  if (Math.hypot(dx, dz) > BALANCE.fire.transferRange) return;
  const slotsFree = world.fire.capacity - world.fire.cooking.length;
  const toTransfer = Math.min(slotsFree, p.stack.count);
  for (let i = 0; i < toTransfer; i++) {
    world.fire.cooking.push({ id: ++world.nextId, timer: BALANCE.fire.cookTimer });
  }
  p.stack.count -= toTransfer;
  if (p.stack.count === 0) p.stack.type = null;
}
```

Then in `update(world, dt)`, after the regen block and before the auto-attack block, add:

```js
  // Try to deposit raw stack onto fire
  tryTransferStackToFire(world);
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 76 tests pass (71 + 5 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/player.js tests/systems/player.test.js
git commit -m "Phase 3.3: player auto-deposits raw stack onto fire when in transferRange"
```

---

## Task 4: Fire mesh render

**Files:** `src/render/fire-mesh.js`

- [ ] **Step 1:** Create `src/render/fire-mesh.js`:

```js
import * as THREE from 'three';

const stoneMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a2c14 });
const flameOrange = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.9 });
const flameYellow = new THREE.MeshBasicMaterial({ color: 0xffd154, transparent: true, opacity: 0.85 });

export function createFireMesh() {
  const group = new THREE.Group();

  // Stone ring base — 8 stones in a circle
  const stoneGeom = new THREE.SphereGeometry(0.18, 6, 5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(stoneGeom, stoneMat);
    stone.position.set(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55);
    stone.castShadow = true;
    group.add(stone);
  }

  // Crossed wood logs
  const logGeom = new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6);
  const log1 = new THREE.Mesh(logGeom, woodMat);
  log1.rotation.z = Math.PI / 2;
  log1.position.y = 0.18;
  log1.castShadow = true;
  group.add(log1);

  const log2 = new THREE.Mesh(logGeom, woodMat);
  log2.rotation.x = Math.PI / 2;
  log2.position.y = 0.22;
  log2.castShadow = true;
  group.add(log2);

  // Flames (two cones for variety)
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 8), flameOrange);
  outerFlame.position.y = 0.65;
  group.add(outerFlame);

  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), flameYellow);
  innerFlame.position.y = 0.6;
  group.add(innerFlame);

  // Animate flicker via group userData — main loop can apply
  group.userData.flameOuter = outerFlame;
  group.userData.flameInner = innerFlame;

  return group;
}

export function tickFireFlicker(group, time) {
  const o = group.userData.flameOuter;
  const i = group.userData.flameInner;
  if (!o || !i) return;
  const s = 0.95 + Math.sin(time * 8) * 0.05;
  o.scale.set(s, 1.0 + Math.sin(time * 6) * 0.06, s);
  i.scale.set(s, 1.0 + Math.cos(time * 7) * 0.07, s);
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/render/fire-mesh.js
git commit -m "Phase 3.4: fire primitive mesh — stone ring, crossed logs, flickering flames"
```

---

## Task 5: Wire fire into main.js

**Files:** `src/main.js`

- [ ] **Step 1:** Modify `src/main.js`:

A) Add imports at top, alongside existing imports:

```js
import { update as updateFire } from './systems/fire.js';
import { createFireMesh, tickFireFlicker } from './render/fire-mesh.js';
```

B) After the fence-mesh setup block (the `const fenceMeshes = new Map();` and its `for (const seg of world.fence.segments)` loop), add fire mesh setup:

```js
const fireMesh = createFireMesh();
fireMesh.position.set(world.fire.pos.x, 0, world.fire.pos.z);
scene.add(fireMesh);
```

C) Add `updateFire` to the `systems` array. Find:

```js
const systems = [updateBear, updateFence, updatePlayer, updateMeat];
```

Replace with:

```js
const systems = [updateBear, updateFence, updateFire, updatePlayer, updateMeat];
```

D) In the `render(world)` function, add a fire-flicker call. Find the last line of the function (before `renderer.render`):

```js
  hud.update(world);
  renderer.render(scene, camera);
```

Replace with:

```js
  tickFireFlicker(fireMesh, world.time.elapsed);
  hud.update(world);
  renderer.render(scene, camera);
```

- [ ] **Step 2:** Verify build + tests.

```bash
npm run build
npm run test:ci
```

Both must succeed. 76 tests pass.

- [ ] **Step 3:** Commit.

```bash
git add src/main.js
git commit -m "Phase 3.5: wire fire system + fire-mesh + flicker animation into main"
```

---

## Task 6: Push and ship

- [ ] **Step 1:** Push.

```bash
git push origin claude/install-superpowers-skill-rfdP9
```

- [ ] **Step 2:** Open PR via GitHub MCP, merge to main, await CI deploy.

- [ ] **Step 3:** iPhone smoke test:
- Костёр виден внутри базы (камни + дрова + мерцающие языки пламени).
- Подходишь к костру с raw-стопкой → стопка переливается, появляются `cooking[]` пузыри (visually skipped — pieces are inside fire, only effect is timer).
- Через 2 секунды cooked-кусок (тёмный коричневый) выпадает на пол рядом с костром.
- Подходишь — auto-pickup в стопку как cooked.
- Стопка cooked отображается (тёмный цвет вместо красного).

---

## Acceptance criteria

- [ ] 76 tests pass.
- [ ] Build clean.
- [ ] iPhone: raw → fire → cooked → pickup full cycle works.
- [ ] No regressions in combat (bear/fence/death still work).

---

## Out of scope for Phase 3

- Customers, register, money — Phase 4.
- Visual representation of pieces inside fire — Phase 6 polish.
- Cooking sound effects — Phase 6.
