# Phase 4 — Sales (Customers + Register + Money) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Игрок несёт стопку cooked-мяса к прилавку → стопка переливается на counter → покупатели спавнятся с края карты, идут в очередь у кассы, забирают по куску, оставляют деньги, уходят. Игрок собирает деньги и они копятся в кармане (HUD).

**Architecture:** Один новый pure-system `src/systems/customer.js` (включает register/money логику). Расширение `src/systems/player.js` для transfer cooked→counter. Новые render-модули `src/render/register-mesh.js`, `src/render/customer-mesh.js`, `src/render/money-mesh.js`. Реестр размещается в фиксированной точке внутри базы (противоположной от костра).

**Tech Stack:** Без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-05-08-bear-meat-tycoon-design.md` секции Customers & Register, Money.

**Branch:** `claude/install-superpowers-skill-rfdP9`.

---

## File structure (added/modified)

```
mobile-game/
├── src/
│   ├── balance.js                   # MODIFY: register.transferRange (1.5), customer.queueOffset (1.2), customer.spawnRingRadius (~22)
│   ├── world.js                     # MODIFY: register.pos = (-3, 0, 3); add customerSpawnTimer
│   ├── main.js                      # MODIFY: wire customer system + register/customer/money meshes
│   ├── systems/
│   │   ├── customer.js              # NEW (includes spawn, AI, money-spawn-on-buy)
│   │   ├── money.js                 # NEW (pickup + despawn — separate from meat.js to keep concerns clean)
│   │   └── player.js                # MODIFY: transfer cooked stack to counter on proximity
│   └── render/
│       ├── register-mesh.js         # NEW
│       ├── customer-mesh.js         # NEW
│       └── money-mesh.js            # NEW
└── tests/
    └── systems/
        ├── customer.test.js         # NEW
        ├── money.test.js            # NEW
        └── player.test.js           # MODIFY: add transfer-to-counter tests
```

---

## Task 1: Balance + register placement + customer params

**Files:** `src/balance.js`, `src/world.js`, tests for both.

- [ ] **Step 1:** Modify `src/balance.js`. Add a new `register:` block after `fire:`:

```js
  register: {
    transferRange: 1.5,
  },
```

In the existing `customer:` block, append `queueOffset: 1.2,` and `spawnRingRadius: 22,` (after existing keys). Final `customer:` block:

```js
  customer: {
    spawnInterval: 3.0,
    buyDuration: 1.0,
    pricePerPiece: 5,
    queueSoftMin: 2,
    queueMax: 5,
    queueOffset: 1.2,
    spawnRingRadius: 22,
  },
```

- [ ] **Step 2:** Modify `src/world.js`. Change:

```js
    register: { pos: null, counterStack: 0, moneyPiles: [] },
```

to:

```js
    register: { pos: { x: -3, z: 3 }, counterStack: 0, moneyPiles: [] },
```

Also add `customerSpawnTimer: 0,` next to other top-level mutable state (next to `playerDamageCD: 0,`):

```js
    nextId: 0,
    playerDamageCD: 0,
    customerSpawnTimer: 0,
```

- [ ] **Step 3:** Add tests:

In `tests/balance.test.js` inside `describe('balance', ...)`:

```js
  it('register and customer transfer/queue params present', () => {
    expect(BALANCE.register.transferRange).toBeGreaterThan(0);
    expect(BALANCE.customer.queueOffset).toBeGreaterThan(0);
    expect(BALANCE.customer.spawnRingRadius).toBeGreaterThan(0);
  });
```

In `tests/world.test.js` inside `describe('createWorld', ...)`:

```js
  it('register is placed at a valid position inside the base, opposite from fire', () => {
    const w = createWorld();
    expect(w.register.pos).not.toBeNull();
    const dist = Math.hypot(w.register.pos.x, w.register.pos.z);
    expect(dist).toBeLessThan(w.base.radius);
    // Reasonably separated from fire to avoid overlap
    const dxFromFire = w.register.pos.x - w.fire.pos.x;
    const dzFromFire = w.register.pos.z - w.fire.pos.z;
    expect(Math.hypot(dxFromFire, dzFromFire)).toBeGreaterThan(3);
  });

  it('customerSpawnTimer initialized to 0', () => {
    const w = createWorld();
    expect(w.customerSpawnTimer).toBe(0);
  });
```

- [ ] **Step 4:** Verify all tests pass.

```bash
npm run test:ci
```

Expected: 79 tests pass (76 + 3 new).

- [ ] **Step 5:** Commit.

```bash
git add src/balance.js src/world.js tests/balance.test.js tests/world.test.js
git commit -m "Phase 4.1: place register at (-3, 3), add register/customer balance params"
```

---

## Task 2: Player → counter cooked transfer

**Files:** `src/systems/player.js`, `tests/systems/player.test.js`

- [ ] **Step 1:** Failing tests — append to `tests/systems/player.test.js`:

```js
describe('player → counter transfer', () => {
  it('transfers cooked stack onto counter when within transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 0.5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 0, cooked: 4 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(4);
    expect(w.player.stack.cooked).toBe(0);
  });

  it('does not transfer raw to counter', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 0.5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 4, cooked: 0 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(0);
    expect(w.player.stack.raw).toBe(4);
  });

  it('does not transfer outside transferRange', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 0, cooked: 3 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(0);
    expect(w.player.stack.cooked).toBe(3);
  });

  it('counter has no max (accepts all cooked)', () => {
    const w = createWorld();
    w.player.pos = { x: w.register.pos.x + 0.5, y: 0, z: w.register.pos.z };
    w.player.stack = { raw: 0, cooked: 50 };
    updatePlayer(w, 0.016);
    expect(w.register.counterStack).toBe(50);
    expect(w.player.stack.cooked).toBe(0);
  });
});
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/player.test.js
```

Expected: FAIL.

- [ ] **Step 3:** Modify `src/systems/player.js`. Add a new helper near the existing `tryTransferStackToFire`:

```js
function tryTransferStackToCounter(world) {
  const p = world.player;
  if (!world.register.pos) return;
  if (p.stack.cooked <= 0) return;
  const dx = world.register.pos.x - p.pos.x;
  const dz = world.register.pos.z - p.pos.z;
  if (Math.hypot(dx, dz) > BALANCE.register.transferRange) return;
  world.register.counterStack += p.stack.cooked;
  p.stack.cooked = 0;
}
```

In `update(world, dt)`, add a call right after the existing `tryTransferStackToFire(world);`:

```js
  tryTransferStackToFire(world);
  tryTransferStackToCounter(world);
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 83 tests pass (79 + 4 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/player.js tests/systems/player.test.js
git commit -m "Phase 4.2: player auto-deposits cooked stack onto counter when in transferRange"
```

---

## Task 3: Customer system — spawn, AI, buy, money drop

**Files:** `src/systems/customer.js`, `tests/systems/customer.test.js`

- [ ] **Step 1:** Failing tests at `tests/systems/customer.test.js`:

```js
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
});
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/customer.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3:** Implementation at `src/systems/customer.js`:

```js
import { BALANCE } from '../balance.js';

const ENTER_THRESHOLD = 0.3;
const LEAVE_THRESHOLD = 0.5;

function moveToward(c, targetX, targetZ, dt, speed = 3.5) {
  const dx = targetX - c.pos.x;
  const dz = targetZ - c.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return 0;
  const step = speed * dt;
  if (step >= dist) {
    c.pos.x = targetX;
    c.pos.z = targetZ;
    return 0;
  }
  c.pos.x += (dx / dist) * step;
  c.pos.z += (dz / dist) * step;
  c.rot = Math.atan2(dx, dz);
  return dist - step;
}

function queueSlotPos(world, queueIndex) {
  // Slots arrayed in front of register (offset along +X from register)
  return {
    x: world.register.pos.x + BALANCE.customer.queueOffset * (queueIndex + 1),
    z: world.register.pos.z,
  };
}

export function spawnCustomer(world) {
  const angle = Math.random() * Math.PI * 2;
  const r = BALANCE.customer.spawnRingRadius;
  // Spawn point and remembered exit point
  const sx = Math.cos(angle) * r;
  const sz = Math.sin(angle) * r;
  const c = {
    id: ++world.nextId,
    pos: { x: sx, z: sz },
    rot: 0,
    state: 'entering',
    buyTimer: 0,
    spawnAngle: angle,
  };
  world.customers.push(c);
  return c;
}

export function update(world, dt) {
  // Spawn timer
  world.customerSpawnTimer -= dt;
  if (world.customerSpawnTimer <= 0) {
    world.customerSpawnTimer = BALANCE.customer.spawnInterval;
    const queueAlive = world.customers.filter(c => c.state !== 'leaving').length;
    const shouldSpawn =
      queueAlive < BALANCE.customer.queueMax &&
      (world.register.counterStack > 0 || queueAlive < BALANCE.customer.queueSoftMin);
    if (shouldSpawn) spawnCustomer(world);
  }

  // Build queue index lookup: only for customers in 'entering' or 'queuing'
  const inQueue = world.customers.filter(c => c.state === 'entering' || c.state === 'queuing');

  // Iterate in reverse for safe removal during iteration
  for (let i = world.customers.length - 1; i >= 0; i--) {
    const c = world.customers[i];
    if (c.state === 'entering') {
      const queueIndex = inQueue.indexOf(c);
      const slot = queueSlotPos(world, queueIndex);
      moveToward(c, slot.x, slot.z, dt);
      const distToSlot = Math.hypot(c.pos.x - slot.x, c.pos.z - slot.z);
      if (distToSlot <= ENTER_THRESHOLD) c.state = 'queuing';
    } else if (c.state === 'queuing') {
      const queueIndex = inQueue.indexOf(c);
      const slot = queueSlotPos(world, queueIndex);
      // Move forward in line as the queue advances
      moveToward(c, slot.x, slot.z, dt);
      // Front of queue + stock available → buy
      if (queueIndex === 0 && world.register.counterStack > 0) {
        c.state = 'buying';
        c.buyTimer = BALANCE.customer.buyDuration;
      }
    } else if (c.state === 'buying') {
      c.buyTimer -= dt;
      if (c.buyTimer <= 0) {
        if (world.register.counterStack > 0) {
          world.register.counterStack--;
          // Drop money pile near register on player-side (offset toward +X away from queue)
          world.register.moneyPiles.push({
            id: ++world.nextId,
            pos: {
              x: world.register.pos.x - 0.8 + (Math.random() - 0.5) * 0.6,
              z: world.register.pos.z - 0.8 + (Math.random() - 0.5) * 0.6,
            },
            amount: BALANCE.customer.pricePerPiece,
          });
        }
        c.state = 'leaving';
      }
    } else if (c.state === 'leaving') {
      const exitX = Math.cos(c.spawnAngle) * BALANCE.customer.spawnRingRadius;
      const exitZ = Math.sin(c.spawnAngle) * BALANCE.customer.spawnRingRadius;
      moveToward(c, exitX, exitZ, dt);
      const distToExit = Math.hypot(c.pos.x - exitX, c.pos.z - exitZ);
      if (distToExit <= LEAVE_THRESHOLD) {
        world.customers.splice(i, 1);
      }
    }
  }
}
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 90 tests pass (83 + 7 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/customer.js tests/systems/customer.test.js
git commit -m "Phase 4.3: customer system — spawn, queue AI, buy, money pile drop, leave"
```

---

## Task 4: Money pickup system

**Files:** `src/systems/money.js`, `tests/systems/money.test.js`

- [ ] **Step 1:** Failing tests at `tests/systems/money.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateMoney } from '../../src/systems/money.js';
import { BALANCE } from '../../src/balance.js';

function dropPile(w, x, z, amount = 5) {
  const p = { id: ++w.nextId, pos: { x, z }, amount };
  w.register.moneyPiles.push(p);
  return p;
}

describe('money pickup', () => {
  it('player picks up money pile within pickupRadius', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropPile(w, 0.3, 0, 7);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(0);
    expect(w.money.pocket).toBe(7);
  });

  it('does not pick up money outside pickupRadius', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropPile(w, 5, 0, 7);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(1);
    expect(w.money.pocket).toBe(0);
  });

  it('does not pick up when player is dead', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    w.player.state = 'dead';
    dropPile(w, 0.3, 0, 7);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(1);
    expect(w.money.pocket).toBe(0);
  });

  it('picks up multiple piles in same frame', () => {
    const w = createWorld();
    w.player.pos = { x: 0, y: 0, z: 0 };
    dropPile(w, 0.3, 0.1, 5);
    dropPile(w, -0.3, -0.1, 3);
    updateMoney(w, 0.016);
    expect(w.register.moneyPiles).toHaveLength(0);
    expect(w.money.pocket).toBe(8);
  });
});
```

- [ ] **Step 2:** Verify red.

```bash
npm run test:ci -- tests/systems/money.test.js
```

- [ ] **Step 3:** Implementation at `src/systems/money.js`:

```js
import { BALANCE } from '../balance.js';

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;
  const r = BALANCE.player.pickupRadius;
  for (let i = world.register.moneyPiles.length - 1; i >= 0; i--) {
    const pile = world.register.moneyPiles[i];
    const d = Math.hypot(pile.pos.x - p.pos.x, pile.pos.z - p.pos.z);
    if (d <= r) {
      world.money.pocket += pile.amount;
      world.register.moneyPiles.splice(i, 1);
    }
  }
}
```

- [ ] **Step 4:** Verify green.

```bash
npm run test:ci
```

Expected: 94 tests pass (90 + 4 new).

- [ ] **Step 5:** Commit.

```bash
git add src/systems/money.js tests/systems/money.test.js
git commit -m "Phase 4.4: money pickup system — auto-collect piles within pickupRadius"
```

---

## Task 5: Render — register, customer, money meshes

**Files:** `src/render/register-mesh.js`, `src/render/customer-mesh.js`, `src/render/money-mesh.js`

- [ ] **Step 1:** Create `src/render/register-mesh.js`:

```js
import * as THREE from 'three';

const counterMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
const cookedMat = new THREE.MeshLambertMaterial({ color: 0x6b3014 });
const STACK_PIECE_HEIGHT = 0.18;

const meatGeom = new THREE.BoxGeometry(0.4, STACK_PIECE_HEIGHT, 0.55);

export function createRegisterMesh() {
  const group = new THREE.Group();

  // Counter base — wide flat box
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 1.0),
    counterMat
  );
  counter.position.y = 0.4;
  counter.castShadow = true;
  counter.receiveShadow = true;
  group.add(counter);

  // Cash register on top — small dark box
  const cashBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
  );
  cashBox.position.set(-0.4, 0.95, 0);
  cashBox.castShadow = true;
  group.add(cashBox);

  // A stack-group child for cooked meat shown on the counter top
  const cookedStack = new THREE.Group();
  cookedStack.position.set(0.2, 0.8, 0);
  group.add(cookedStack);
  group.userData.cookedStack = cookedStack;

  return group;
}

export function syncRegisterStack(group, counterStack) {
  const stack = group.userData.cookedStack;
  while (stack.children.length > counterStack) stack.children.pop();
  while (stack.children.length < counterStack) {
    const piece = new THREE.Mesh(meatGeom, cookedMat);
    piece.castShadow = true;
    stack.add(piece);
  }
  for (let i = 0; i < stack.children.length; i++) {
    stack.children[i].position.set(0, i * STACK_PIECE_HEIGHT, 0);
  }
}
```

- [ ] **Step 2:** Create `src/render/customer-mesh.js`:

```js
import * as THREE from 'three';

// Pool of clothing colors for visual variety
const SHIRTS = [0x4a78c8, 0xc8a878, 0x8a6a3a, 0x4a8a6a, 0xa86890, 0xc06848];

export function createCustomerMesh() {
  const group = new THREE.Group();
  const shirtColor = SHIRTS[Math.floor(Math.random() * SHIRTS.length)];

  // Body
  const bodyMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), bodyMat);
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8c8a0 })
  );
  head.position.y = 1.4;
  head.castShadow = true;
  group.add(head);

  return group;
}
```

- [ ] **Step 3:** Create `src/render/money-mesh.js`:

```js
import * as THREE from 'three';

const billMat = new THREE.MeshLambertMaterial({ color: 0x5ec85a });

export function createMoneyMesh() {
  const group = new THREE.Group();
  // A small fan of bills lying flat
  for (let i = 0; i < 3; i++) {
    const bill = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.22),
      billMat
    );
    bill.position.y = 0.04 + i * 0.045;
    bill.rotation.y = (i - 1) * 0.2;
    bill.castShadow = true;
    group.add(bill);
  }
  return group;
}
```

- [ ] **Step 4:** Commit.

```bash
git add src/render/register-mesh.js src/render/customer-mesh.js src/render/money-mesh.js
git commit -m "Phase 4.5: register/customer/money primitive meshes"
```

---

## Task 6: Wire into main.js

**Files:** `src/main.js`

- [ ] **Step 1:** Modify `src/main.js`:

A) Add imports:

```js
import { update as updateCustomer } from './systems/customer.js';
import { update as updateMoney } from './systems/money.js';
import { createRegisterMesh, syncRegisterStack } from './render/register-mesh.js';
import { createCustomerMesh } from './render/customer-mesh.js';
import { createMoneyMesh } from './render/money-mesh.js';
```

B) After the fire-mesh setup block, add register-mesh setup:

```js
const registerMesh = createRegisterMesh();
registerMesh.position.set(world.register.pos.x, 0, world.register.pos.z);
scene.add(registerMesh);
```

C) Find:

```js
const bearMeshes = new Map();
const meatMeshes = new Map();
```

Add right after:

```js
const customerMeshes = new Map();
const moneyMeshes = new Map();
```

D) Find the systems array:

```js
const systems = [updateBear, updateFence, updateFire, updatePlayer, updateMeat];
```

Replace with:

```js
const systems = [updateBear, updateFence, updateFire, updateCustomer, updatePlayer, updateMeat, updateMoney];
```

E) In `render(world)`, after the bears/meat sync calls, add customer + money + register-stack sync:

```js
  syncEntityMeshes(world.customers, customerMeshes, scene, () => createCustomerMesh());
  syncEntityMeshes(world.register.moneyPiles, moneyMeshes, scene, () => createMoneyMesh());
  syncRegisterStack(registerMesh, world.register.counterStack);
```

(Place these immediately before the `tickFireFlicker` call.)

- [ ] **Step 2:** Verify build + tests.

```bash
npm run build
npm run test:ci
```

Both must succeed. 94 tests pass.

- [ ] **Step 3:** Commit.

```bash
git add src/main.js
git commit -m "Phase 4.6: wire customer/money systems and register/customer/money meshes into main"
```

---

## Task 7: Push and ship

- [ ] **Step 1:** Push.

```bash
git push origin claude/install-superpowers-skill-rfdP9
```

- [ ] **Step 2:** Open PR to main, merge, await CI deploy.

- [ ] **Step 3:** iPhone smoke test:
- Касса (деревянный прилавок + чёрный кассовый аппарат) видна внутри базы, противоположно от костра.
- Подходишь к ней с cooked-стопкой → стопка переливается на counter (видно как куски нарастают сверху прилавка).
- Покупатели появляются с края карты, идут к кассе, выстраиваются в очередь, по одному забирают мясо.
- После каждой покупки рядом с кассой выпадает зелёная купюра.
- Подходишь к деньгам — собираются, счётчик 💰 в углу растёт.
- Покупатель уходит обратно к краю карты после покупки.

---

## Acceptance criteria

- [ ] 94 tests pass.
- [ ] Build clean.
- [ ] iPhone: full cycle from raw bear meat → cooked at fire → counter → customer buy → money pickup works.
- [ ] No regressions in combat/cooking/death/respawn.

---

## Out of scope for Phase 4

- Upgrade pads (repair-fence, hire-cook, hire-cashier) — Phase 5.
- Customer animations / variations — Phase 6.
- Sound — Phase 6.
