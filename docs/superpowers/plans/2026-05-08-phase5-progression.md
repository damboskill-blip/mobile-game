# Phase 5 — Progression (Upgrade Pads + Employees) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Три стационарных пада прокачки на карте (ремонт забора, найм повара, найм кассира). Игрок стоит на паде с деньгами в кармане → деньги переливаются в пад. По достижении стоимости — эффект применяется. Ремонт многоразовый, повар и кассир — разовые.

- **repair-fence** ($200, многоразовый): возле северного забора. Эффект: восстановить HP всех сегментов, broken=false.
- **hire-cook** ($500, разовый): рядом с костром. Эффект: спавн NPC-повара, который сам носит cooked-мясо с пола рядом с костром на counter.
- **hire-cashier** ($800, разовый): рядом с кассой. Эффект: спавн NPC-кассира у кассы, при наличии которого `customer.buyDuration` уменьшается вдвое.

**Architecture:** Новый pure-system `src/systems/upgrade-pad.js` (deposit + effect application). Новый `src/systems/employee.js` (cook AI + cashier effect helper). Расширение `src/systems/customer.js` (использует cashier-helper). Новые render: `src/render/pad-mesh.js`, `src/render/employee-mesh.js`. UI overlay для floating-labels над падами.

**Spec:** `docs/superpowers/specs/2026-05-08-bear-meat-tycoon-design.md` секции Upgrade Pads, Employees.

**Branch:** `claude/install-superpowers-skill-rfdP9`.

---

## File structure (added/modified)

```
mobile-game/
├── src/
│   ├── balance.js                   # MODIFY: add pad.zoneRadius (0.8)
│   ├── world.js                     # MODIFY: createWorld initializes upgradePads with 3 entries
│   ├── main.js                      # MODIFY: wire pad + employee systems and meshes, pad UI labels
│   ├── ui.js                        # MODIFY: add setupPadLabels() helper
│   ├── systems/
│   │   ├── upgrade-pad.js           # NEW
│   │   ├── employee.js              # NEW (cook AI + cashier-effect getter)
│   │   └── customer.js              # MODIFY: use cashier-effect to halve buyDuration
│   └── render/
│       ├── pad-mesh.js              # NEW
│       └── employee-mesh.js         # NEW
└── tests/
    └── systems/
        ├── upgrade-pad.test.js      # NEW
        ├── employee.test.js         # NEW
        └── customer.test.js         # MODIFY: cashier halves buyDuration
```

---

## Task 1: Initial pad placement in world + balance

**Files:** `src/balance.js`, `src/world.js`, tests.

- [ ] **Step 1:** `src/balance.js` — add to `pads:` block: `zoneRadius: 0.8,` after `depositRate`. Final block:

```js
  pads: {
    repairFenceCost: 200,
    hireCookCost: 500,
    hireCashierCost: 800,
    depositRate: 50,
    zoneRadius: 0.8,
  },
```

- [ ] **Step 2:** `src/world.js` — modify `createWorld` so `upgradePads:` returns three pre-configured entries:

Find:
```js
    upgradePads: [],
```
Replace with:
```js
    upgradePads: createUpgradePads(),
```

Add the helper (after `createFenceSegments`):

```js
function createUpgradePads() {
  return [
    {
      id: -1, type: 'repair-fence',
      pos: { x: 0, z: 8 },
      cost: BALANCE.pads.repairFenceCost,
      deposited: 0,
      completed: false,
      multiUse: true,
    },
    {
      id: -2, type: 'hire-cook',
      pos: { x: 5, z: -3 },
      cost: BALANCE.pads.hireCookCost,
      deposited: 0,
      completed: false,
      multiUse: false,
    },
    {
      id: -3, type: 'hire-cashier',
      pos: { x: -5, z: 3 },
      cost: BALANCE.pads.hireCashierCost,
      deposited: 0,
      completed: false,
      multiUse: false,
    },
  ];
}
```

(Negative IDs because pads are created at world init, before any other entity, and are stable — they don't conflict with `world.nextId` allocations.)

- [ ] **Step 3:** Add tests to `tests/world.test.js` inside `describe('createWorld', ...)`:

```js
  it('upgrade pads are pre-placed: 3 pads with correct types', () => {
    const w = createWorld();
    const types = w.upgradePads.map(p => p.type).sort();
    expect(types).toEqual(['hire-cashier', 'hire-cook', 'repair-fence']);
    for (const p of w.upgradePads) {
      expect(p.deposited).toBe(0);
      expect(p.completed).toBe(false);
      expect(typeof p.cost).toBe('number');
      expect(p.cost).toBeGreaterThan(0);
    }
  });
```

Add to `tests/balance.test.js` inside `describe('balance', ...)`:

```js
  it('pad zoneRadius is positive', () => {
    expect(BALANCE.pads.zoneRadius).toBeGreaterThan(0);
  });
```

- [ ] **Step 4:** `npm run test:ci` — expect 97 tests pass (95 + 2).

- [ ] **Step 5:** Commit.

```bash
git add src/balance.js src/world.js tests/balance.test.js tests/world.test.js
git commit -m "Phase 5.1: place 3 upgrade pads in createWorld with type/cost/multiUse"
```

---

## Task 2: Upgrade pad deposit system

**Files:** `src/systems/upgrade-pad.js`, `tests/systems/upgrade-pad.test.js`

- [ ] **Step 1:** Failing tests at `tests/systems/upgrade-pad.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updatePad } from '../../src/systems/upgrade-pad.js';
import { BALANCE } from '../../src/balance.js';

function repairPad(w) { return w.upgradePads.find(p => p.type === 'repair-fence'); }
function cookPad(w) { return w.upgradePads.find(p => p.type === 'hire-cook'); }
function cashierPad(w) { return w.upgradePads.find(p => p.type === 'hire-cashier'); }

describe('upgrade pad deposit', () => {
  it('deposits at depositRate per second while player on pad with money', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 0.5);
    const expected = BALANCE.pads.depositRate * 0.5; // 25
    expect(w.money.pocket).toBeCloseTo(100 - expected, 5);
    expect(pad.deposited).toBeCloseTo(expected, 5);
  });

  it('does not deposit when player not on pad', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x + 5, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 1.0);
    expect(w.money.pocket).toBe(100);
    expect(pad.deposited).toBe(0);
  });

  it('does not deposit when player has no money', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 0;
    updatePad(w, 1.0);
    expect(pad.deposited).toBe(0);
  });

  it('does not deposit on a completed one-shot pad', () => {
    const w = createWorld();
    const pad = cookPad(w);
    pad.completed = true;
    pad.deposited = pad.cost;
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 100;
    updatePad(w, 1.0);
    expect(w.money.pocket).toBe(100);
    expect(pad.deposited).toBe(pad.cost); // unchanged
  });

  it('caps deposit at cost (does not over-fill)', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = 9999;
    updatePad(w, 100); // way more than needed
    expect(pad.deposited).toBe(0); // reset on completion
    expect(pad.completed).toBe(true);
    expect(w.money.pocket).toBeCloseTo(9999 - pad.cost, 5);
  });
});

describe('upgrade pad effect on completion', () => {
  it('repair-fence on completion repairs all fence segments and resets deposited (multi-use)', () => {
    const w = createWorld();
    // Damage some segments
    w.fence.segments[0].hp = 10;
    w.fence.segments[1].hp = 0;
    w.fence.segments[1].broken = true;
    const pad = repairPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    for (const s of w.fence.segments) {
      expect(s.hp).toBe(BALANCE.fence.hpPerSegment);
      expect(s.broken).toBe(false);
    }
    expect(pad.completed).toBe(false); // multi-use, never sets completed
    expect(pad.deposited).toBe(0);    // reset
  });

  it('hire-cook on completion adds a cook employee and marks pad completed', () => {
    const w = createWorld();
    const pad = cookPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cook')).toHaveLength(1);
    expect(pad.completed).toBe(true);
  });

  it('hire-cashier on completion adds a cashier employee and marks pad completed', () => {
    const w = createWorld();
    const pad = cashierPad(w);
    w.player.pos = { x: pad.pos.x, y: 0, z: pad.pos.z };
    w.money.pocket = pad.cost;
    updatePad(w, 100);
    expect(w.employees.filter(e => e.type === 'cashier')).toHaveLength(1);
    expect(pad.completed).toBe(true);
  });
});
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/upgrade-pad.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3:** Implementation at `src/systems/upgrade-pad.js`:

```js
import { BALANCE } from '../balance.js';
import { repairAllSegments } from './fence.js';

function applyEffect(world, pad) {
  if (pad.type === 'repair-fence') {
    repairAllSegments(world);
  } else if (pad.type === 'hire-cook') {
    world.employees.push({
      id: ++world.nextId,
      type: 'cook',
      pos: { x: world.fire.pos.x, z: world.fire.pos.z },
      rot: 0,
      state: 'idle',
      target: null,
      carrying: false,
    });
  } else if (pad.type === 'hire-cashier') {
    world.employees.push({
      id: ++world.nextId,
      type: 'cashier',
      pos: { x: world.register.pos.x + 0.6, z: world.register.pos.z + 0.6 },
      rot: 0,
      state: 'idle',
    });
  }
}

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;
  for (const pad of world.upgradePads) {
    if (pad.completed && !pad.multiUse) continue;
    const d = Math.hypot(pad.pos.x - p.pos.x, pad.pos.z - p.pos.z);
    if (d > BALANCE.pads.zoneRadius) continue;
    if (world.money.pocket <= 0) continue;

    const remaining = pad.cost - pad.deposited;
    const maxThisFrame = Math.min(BALANCE.pads.depositRate * dt, world.money.pocket, remaining);
    pad.deposited += maxThisFrame;
    world.money.pocket -= maxThisFrame;

    if (pad.deposited >= pad.cost - 1e-6) {
      applyEffect(world, pad);
      if (pad.multiUse) {
        pad.deposited = 0;
      } else {
        pad.completed = true;
      }
    }
  }
}
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 105 tests pass (97 + 8 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/upgrade-pad.js tests/systems/upgrade-pad.test.js
git commit -m "Phase 5.2: upgrade pad deposit system + effects (repair-fence, hire-cook, hire-cashier)"
```

---

## Task 3: Cook employee AI

**Files:** `src/systems/employee.js`, `tests/systems/employee.test.js`

- [ ] **Step 1:** Failing tests at `tests/systems/employee.test.js`:

```js
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
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/employee.test.js
```

- [ ] **Step 3:** Implementation at `src/systems/employee.js`:

```js
import { BALANCE } from '../balance.js';

const COOK_SPEED = 4.0;
const COOK_PICKUP_RADIUS = 0.6;
const COOK_DROPOFF_RADIUS = 1.2;

function moveToward(emp, targetX, targetZ, dt, speed) {
  const dx = targetX - emp.pos.x;
  const dz = targetZ - emp.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = speed * dt;
  if (step >= dist) {
    emp.pos.x = targetX;
    emp.pos.z = targetZ;
    return 0;
  }
  emp.pos.x += (dx / dist) * step;
  emp.pos.z += (dz / dist) * step;
  emp.rot = Math.atan2(dx, dz);
  return dist - step;
}

function findNearestCookedNearFire(world) {
  const fp = world.fire.pos;
  let best = null;
  let bestDist = Infinity;
  for (const piece of world.meatCooked) {
    const d = Math.hypot(piece.pos.x - fp.x, piece.pos.z - fp.z);
    if (d > 4.0) continue; // only pick up pieces close to the fire
    if (d < bestDist) { best = piece; bestDist = d; }
  }
  return best;
}

export function hasCashier(world) {
  return world.employees.some(e => e.type === 'cashier');
}

export function currentBuyDuration(world) {
  return hasCashier(world)
    ? BALANCE.customer.buyDuration / 2
    : BALANCE.customer.buyDuration;
}

export function update(world, dt) {
  for (const emp of world.employees) {
    if (emp.type !== 'cook') continue; // cashier has no AI

    if (emp.state === 'idle') {
      const piece = findNearestCookedNearFire(world);
      if (piece) {
        emp.state = 'going-to-cooked';
        emp.target = piece.id;
      }
    } else if (emp.state === 'going-to-cooked') {
      const piece = world.meatCooked.find(p => p.id === emp.target);
      if (!piece) {
        emp.state = 'idle';
        emp.target = null;
        continue;
      }
      moveToward(emp, piece.pos.x, piece.pos.z, dt, COOK_SPEED);
      const d = Math.hypot(emp.pos.x - piece.pos.x, emp.pos.z - piece.pos.z);
      if (d <= COOK_PICKUP_RADIUS) {
        const idx = world.meatCooked.indexOf(piece);
        if (idx >= 0) world.meatCooked.splice(idx, 1);
        emp.carrying = true;
        emp.target = null;
        emp.state = 'going-to-counter';
      }
    } else if (emp.state === 'going-to-counter') {
      moveToward(emp, world.register.pos.x, world.register.pos.z, dt, COOK_SPEED);
      const d = Math.hypot(emp.pos.x - world.register.pos.x, emp.pos.z - world.register.pos.z);
      if (d <= COOK_DROPOFF_RADIUS) {
        if (emp.carrying) {
          world.register.counterStack += 1;
          emp.carrying = false;
        }
        emp.state = 'idle';
      }
    }
  }
}
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 112 tests pass (105 + 7 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/employee.js tests/systems/employee.test.js
git commit -m "Phase 5.3: cook employee AI (idle → going-to-cooked → carrying → going-to-counter) + cashier helpers"
```

---

## Task 4: Customer system uses cashier helper

**Files:** `src/systems/customer.js`, `tests/systems/customer.test.js`

- [ ] **Step 1:** Modify `src/systems/customer.js`. Add import at top:

```js
import { currentBuyDuration } from './employee.js';
```

Find the line in `update` that sets `c.buyTimer`:

```js
        c.buyTimer = BALANCE.customer.buyDuration;
```

Replace with:

```js
        c.buyTimer = currentBuyDuration(world);
```

- [ ] **Step 2:** Add a new test inside `describe('customer AI', ...)` in `tests/systems/customer.test.js`:

```js
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
```

- [ ] **Step 3:** Verify all tests pass.

```bash
npm run test:ci
```

Expected: 113 tests pass (112 + 1 new).

- [ ] **Step 4:** Commit.

```bash
git add src/systems/customer.js tests/systems/customer.test.js
git commit -m "Phase 5.4: customer buyDuration halved when cashier is hired"
```

---

## Task 5: Pad mesh

**Files:** `src/render/pad-mesh.js`

- [ ] **Step 1:** Create `src/render/pad-mesh.js`:

```js
import * as THREE from 'three';

const padBaseMat = new THREE.MeshLambertMaterial({ color: 0x4a8a6a });
const padFillMat = new THREE.MeshLambertMaterial({ color: 0xffd154 });
const padDoneMat = new THREE.MeshLambertMaterial({ color: 0x88aa66 });

const PAD_RADIUS = 0.95;

export function createPadMesh() {
  const group = new THREE.Group();
  // Disk on the ground
  const baseGeom = new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.06, 24);
  const base = new THREE.Mesh(baseGeom, padBaseMat);
  base.position.y = 0.03;
  base.receiveShadow = true;
  group.add(base);

  // Inner fill ring (deposit progress) — initially 0 scale
  const fillGeom = new THREE.CylinderGeometry(PAD_RADIUS - 0.05, PAD_RADIUS - 0.05, 0.07, 24);
  const fill = new THREE.Mesh(fillGeom, padFillMat);
  fill.position.y = 0.04;
  fill.scale.set(0.001, 1, 0.001);
  group.add(fill);

  group.userData.base = base;
  group.userData.fill = fill;
  return group;
}

export function syncPadMesh(group, pad) {
  const fill = group.userData.fill;
  const base = group.userData.base;
  if (pad.completed && !pad.multiUse) {
    base.material = padDoneMat;
    fill.scale.set(0.001, 1, 0.001);
  } else {
    base.material = padBaseMat;
    const progress = Math.min(1, pad.deposited / pad.cost);
    fill.scale.set(progress, 1, progress);
  }
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/render/pad-mesh.js
git commit -m "Phase 5.5: pad primitive mesh — green disk with yellow deposit-fill ring"
```

---

## Task 6: Employee mesh

**Files:** `src/render/employee-mesh.js`

- [ ] **Step 1:** Create `src/render/employee-mesh.js`:

```js
import * as THREE from 'three';

const cookShirtMat = new THREE.MeshLambertMaterial({ color: 0xeae0d4 });   // chef whites
const cookHatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const cashierShirtMat = new THREE.MeshLambertMaterial({ color: 0x3a3aa0 }); // navy
const headMat = new THREE.MeshLambertMaterial({ color: 0xe8c8a0 });

export function createEmployeeMesh(type) {
  const group = new THREE.Group();
  const shirtMat = type === 'cook' ? cookShirtMat : cashierShirtMat;

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.75, 4, 8), shirtMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), headMat);
  head.position.y = 1.5;
  head.castShadow = true;
  group.add(head);

  // Cook gets a chef's hat
  if (type === 'cook') {
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.18, 0.3, 12),
      cookHatMat
    );
    hat.position.y = 1.85;
    hat.castShadow = true;
    group.add(hat);
  }

  return group;
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/render/employee-mesh.js
git commit -m "Phase 5.6: employee primitive mesh (cook with chef hat, cashier in navy)"
```

---

## Task 7: UI — pad floating labels

**Files:** `src/ui.js`

- [ ] **Step 1:** Modify `src/ui.js`. Append a new export `setupPadLabels` after the existing `setupHud`:

```js
const PAD_TEXT = {
  'repair-fence': '🔨 Repair fence',
  'hire-cook': '🍳 Hire cook',
  'hire-cashier': '💼 Hire cashier',
};

export function setupPadLabels(container = document.body) {
  const labels = new Map();
  return {
    sync(world, camera) {
      // Ensure DOM elements exist for each pad
      for (const pad of world.upgradePads) {
        if (!labels.has(pad.id)) {
          const el = document.createElement('div');
          el.style.cssText = `
            position: fixed;
            transform: translate(-50%, -100%);
            padding: 4px 10px;
            background: rgba(0,0,0,0.65);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 5;
            text-shadow: 0 1px 2px rgba(0,0,0,0.6);
          `;
          container.appendChild(el);
          labels.set(pad.id, el);
        }
      }
      // Update content + screen position
      for (const pad of world.upgradePads) {
        const el = labels.get(pad.id);
        const text = PAD_TEXT[pad.type] || pad.type;
        if (pad.completed && !pad.multiUse) {
          el.textContent = `${text} ✓`;
          el.style.opacity = '0.55';
        } else {
          el.textContent = `${text} · $${Math.round(pad.deposited)}/${pad.cost}`;
          el.style.opacity = '1';
        }
        // Project pad.pos to screen coords
        const v = padToScreen(pad.pos, camera);
        if (v) {
          el.style.left = `${v.x}px`;
          el.style.top = `${v.y - 50}px`;
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      }
    },
  };
}

function padToScreen(pos, camera) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Use a temporary vector
  const v = { x: pos.x, y: 0, z: pos.z };
  // Three.js project requires a Vector3; simulate manually:
  const m = camera.matrixWorldInverse;
  const px = m.elements[0]*v.x + m.elements[4]*v.y + m.elements[8]*v.z + m.elements[12];
  const py = m.elements[1]*v.x + m.elements[5]*v.y + m.elements[9]*v.z + m.elements[13];
  const pz = m.elements[2]*v.x + m.elements[6]*v.y + m.elements[10]*v.z + m.elements[14];
  const pw = m.elements[3]*v.x + m.elements[7]*v.y + m.elements[11]*v.z + m.elements[15];
  // Now apply projection
  const pm = camera.projectionMatrix;
  let cx = pm.elements[0]*px + pm.elements[4]*py + pm.elements[8]*pz + pm.elements[12]*pw;
  let cy = pm.elements[1]*px + pm.elements[5]*py + pm.elements[9]*pz + pm.elements[13]*pw;
  const cz = pm.elements[2]*px + pm.elements[6]*py + pm.elements[10]*pz + pm.elements[14]*pw;
  const cw = pm.elements[3]*px + pm.elements[7]*py + pm.elements[11]*pz + pm.elements[15]*pw;
  if (cw <= 0) return null; // behind camera
  cx /= cw;
  cy /= cw;
  return {
    x: (cx + 1) * 0.5 * w,
    y: (1 - (cy + 1) * 0.5) * h,
  };
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/ui.js
git commit -m "Phase 5.7: floating HTML labels for pads with cost/progress projection"
```

---

## Task 8: Wire into main.js

**Files:** `src/main.js`

- [ ] **Step 1:** Modify `src/main.js`:

A) Add imports:

```js
import { update as updateUpgradePad } from './systems/upgrade-pad.js';
import { update as updateEmployee } from './systems/employee.js';
import { createPadMesh, syncPadMesh } from './render/pad-mesh.js';
import { createEmployeeMesh } from './render/employee-mesh.js';
import { setupHud, setupPadLabels } from './ui.js';
```

(replace existing `import { setupHud } from './ui.js';` with the line above that includes `setupPadLabels`)

B) After register-mesh setup, add pad-mesh setup:

```js
const padMeshes = new Map();
for (const pad of world.upgradePads) {
  const m = createPadMesh();
  m.position.set(pad.pos.x, 0, pad.pos.z);
  scene.add(m);
  padMeshes.set(pad.id, m);
}

const employeeMeshes = new Map();
const padLabels = setupPadLabels();
```

C) Update systems array:

```js
const systems = [updateBear, updateFence, updateFire, updateCustomer, updatePlayer, updateMeat, updateMoney, updateUpgradePad, updateEmployee];
```

D) In `render(world)`, before `tickFireFlicker`, add:

```js
  for (const pad of world.upgradePads) {
    const m = padMeshes.get(pad.id);
    if (m) syncPadMesh(m, pad);
  }
  syncEntityMeshes(world.employees, employeeMeshes, scene, (e) => createEmployeeMesh(e.type));
  padLabels.sync(world, camera);
```

- [ ] **Step 2:** Verify build + tests.

```bash
npm run build
npm run test:ci
```

113 tests pass.

- [ ] **Step 3:** Commit + push.

```bash
git add src/main.js
git commit -m "Phase 5.8: wire upgrade-pad/employee systems + meshes + pad labels into main"
git push origin claude/install-superpowers-skill-rfdP9
```

---

## Task 9: Ship

- Open PR `claude/install-superpowers-skill-rfdP9` → `main` via GitHub MCP, merge.
- Wait for CI deploy.
- iPhone smoke test:
  - 3 зелёных диска видны: один у северного забора, один возле костра, один возле кассы.
  - Над каждым плавающий лейбл `🔨 Repair fence · $0/200` и т.п.
  - Стоишь на паде с деньгами в кармане — деньги переливаются (счётчик 💰 уменьшается, на паде растёт жёлтый внутренний диск).
  - Заполнен пад «Hire cook» → появляется NPC в шеф-колпаке у костра, начинает носить cooked-куски на counter.
  - Заполнен «Hire cashier» → появляется NPC в синей рубашке у кассы, скорость покупателей удваивается.
  - Repair-fence можно использовать многократно: после починки диск становится снова зелёным, лейбл `… · $0/200`.

---

## Acceptance criteria

- [ ] 113 unit tests pass.
- [ ] Build clean.
- [ ] iPhone: full progression loop works — earn money, deposit on pad, NPCs appear/repair triggers.
- [ ] No regressions in combat/cooking/sales.

---

## Out of scope for Phase 5

- Multiple cooks / cashiers (max 1 each).
- Audio cues on pad completion.
- Lifecycle of broken segments (still no repair without pad now — repair pad fills the gap).
- Save/restore of pad state (will be addressed in Phase 6 when full save returns).
