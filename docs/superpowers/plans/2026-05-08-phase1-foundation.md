# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Игрок ходит по плоскому полю джойстиком, камера следует, HUD показывает $0, проект открывается на iPhone Safari как PWA в полноэкранном режиме.

**Architecture:** Vite + ES-модули + Vitest. Чистая логика в `src/systems/` и `src/world.js`, рендер в `src/render/`. World — единый mutable объект, системы вызываются последовательно с `(world, dt)`. Three.js перерисовывает сцену каждый кадр на основе world.

**Tech Stack:** Vite 5, Three.js 0.160+, Vitest 1.x, vite-plugin-pwa, Web Audio API (для будущих фаз). Деплой на GitHub Pages через GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-08-bear-meat-tycoon-design.md`

---

## File Structure (создаётся в этой фазе)

```
mobile-game/
├── package.json                       # vite, three, vitest, vite-plugin-pwa
├── vite.config.js                     # base path для GH Pages, PWA-плагин
├── vitest.config.js                   # test environment: node
├── index.html                         # entry, viewport meta, manifest link
├── .gitignore                         # node_modules, dist
├── public/
│   ├── manifest.webmanifest           # PWA-манифест
│   └── icons/
│       ├── icon-192.png               # placeholder, заменим позже
│       ├── icon-512.png               # placeholder
│       └── apple-touch-icon-180.png   # placeholder
├── src/
│   ├── main.js                        # bootstrap: создание world, scene, loop start
│   ├── balance.js                     # все константы (только foundation-relevant)
│   ├── world.js                       # createWorld(), saveWorld(), loadWorld()
│   ├── loop.js                        # RAF wrapper с фиксированным dt
│   ├── input.js                       # virtual joystick (touch events)
│   ├── camera.js                      # follow-camera helper
│   ├── ui.js                          # HUD overlay (money counter)
│   ├── systems/
│   │   └── player.js                  # update(world, dt): движение от input
│   └── render/
│       ├── scene.js                   # createScene(): Three.js scene+lights+ground
│       └── meshes.js                  # createPlayerMesh(): primitive capsule+box
├── tests/
│   ├── balance.test.js
│   ├── world.test.js
│   └── systems/
│       └── player.test.js
└── .github/workflows/
    └── deploy.yml                     # CI: install, test, build, deploy gh-pages
```

---

## Task 1: Project bootstrap (package.json + vite + vitest config)

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bear-meat-tycoon",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ci": "vitest run"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/mobile-game/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'manifest.webmanifest'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,glb,webmanifest}'],
        runtimeCaching: [{
          urlPattern: /\.(?:glb)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'models', expiration: { maxEntries: 50 } }
        }]
      }
    })
  ],
  server: { host: true }
});
```

- [ ] **Step 3: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  }
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules
dist
dev-dist
.DS_Store
*.log
```

- [ ] **Step 5: Install and verify**

```bash
npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js vitest.config.js .gitignore package-lock.json
git commit -m "Phase 1.1: bootstrap Vite + Vitest + PWA scaffold"
```

---

## Task 2: balance.js with foundation constants + test

**Files:**
- Create: `src/balance.js`
- Create: `tests/balance.test.js`

- [ ] **Step 1: Write the failing test** in `tests/balance.test.js`

```js
import { describe, it, expect } from 'vitest';
import { BALANCE, BALANCE_VERSION } from '../src/balance.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:ci -- tests/balance.test.js
```

Expected: FAIL with "Cannot find module '../src/balance.js'".

- [ ] **Step 3: Create `src/balance.js`** with all spec values

```js
export const BALANCE_VERSION = 1;

export const BALANCE = {
  base: {
    radius: 12,
  },
  player: {
    speed: 5,
    hpMax: 100,
    respawn: 2,
    pickupRadius: 1.0,
    stack: { max: 10 },
    axe: { range: 1.8, damage: 35, cooldown: 0.4 },
  },
  bear: {
    hpBase: 70,
    speed: 2.5,
    damageFenceBase: 10,
    damagePlayer: 15,
    attackCD: 1.0,
    meatDrops: 3,
  },
  fence: {
    segments: 16,
    hpPerSegment: 100,
  },
  fire: {
    capacity: 5,
    cookTimer: 2.0,
  },
  meat: {
    despawn: 60,
  },
  customer: {
    spawnInterval: 3.0,
    buyDuration: 1.0,
    pricePerPiece: 5,
    queueSoftMin: 2,
    queueMax: 5,
  },
  pads: {
    repairFenceCost: 200,
    hireCookCost: 500,
    hireCashierCost: 800,
    depositRate: 50,
  },
};

// Difficulty scaling — m = elapsed minutes
export function bearSpawnPeriod(m) {
  return Math.max(1.0, Math.min(4.0, 4.0 - 0.3 * m));
}

export function bearHp(m) {
  return BALANCE.bear.hpBase + 5 * m;
}

export function bearDamageFence(m) {
  return Math.max(10, Math.min(20, BALANCE.bear.damageFenceBase + 1 * m));
}
```

- [ ] **Step 4: Add scaling tests** to `tests/balance.test.js`

Update the import line at the top of the file:

```js
import { BALANCE, BALANCE_VERSION, bearSpawnPeriod, bearHp, bearDamageFence } from '../src/balance.js';
```

Then append a new describe block:

```js
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
```

- [ ] **Step 5: Run all balance tests, verify pass**

```bash
npm run test:ci -- tests/balance.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/balance.js tests/balance.test.js
git commit -m "Phase 1.2: balance.js with constants and scaling formulas"
```

---

## Task 3: World factory + test

**Files:**
- Create: `src/world.js`
- Create: `tests/world.test.js`

- [ ] **Step 1: Write failing test** in `tests/world.test.js`

```js
import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/world.js';

describe('createWorld', () => {
  it('returns world with required top-level shape', () => {
    const w = createWorld();
    expect(w.time).toEqual({ elapsed: 0, dt: 0, frameCount: 0 });
    expect(w.base).toEqual({ center: { x: 0, z: 0 }, radius: 12 });
    expect(w.money).toEqual({ pocket: 0 });
    expect(w.nextId).toBe(0);
  });

  it('player starts at base center with full HP', () => {
    const w = createWorld();
    expect(w.player.pos).toEqual({ x: 0, y: 0, z: 0 });
    expect(w.player.rot).toBe(0);
    expect(w.player.hp).toBe(100);
    expect(w.player.hpMax).toBe(100);
    expect(w.player.state).toBe('alive');
    expect(w.player.respawnTimer).toBe(0);
    expect(w.player.stack).toEqual({ type: null, count: 0, max: 10 });
    expect(w.player.input).toEqual({ move: { x: 0, z: 0 } });
  });

  it('initializes empty entity arrays', () => {
    const w = createWorld();
    expect(w.bears).toEqual([]);
    expect(w.meatRaw).toEqual([]);
    expect(w.meatCooked).toEqual([]);
    expect(w.customers).toEqual([]);
    expect(w.employees).toEqual([]);
  });

  it('fence has 16 segments equally spaced', () => {
    const w = createWorld();
    expect(w.fence.segments).toHaveLength(16);
    for (const seg of w.fence.segments) {
      expect(seg.hp).toBe(100);
      expect(seg.broken).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm run test:ci -- tests/world.test.js
```

Expected: FAIL with "Cannot find module '../src/world.js'".

- [ ] **Step 3: Create `src/world.js`**

```js
import { BALANCE } from './balance.js';

export function createWorld() {
  return {
    time: { elapsed: 0, dt: 0, frameCount: 0 },
    base: { center: { x: 0, z: 0 }, radius: BALANCE.base.radius },
    player: {
      pos: { x: 0, y: 0, z: 0 },
      rot: 0,
      hp: BALANCE.player.hpMax,
      hpMax: BALANCE.player.hpMax,
      state: 'alive',
      respawnTimer: 0,
      speed: BALANCE.player.speed,
      axe: { ...BALANCE.player.axe, cooldownTimer: 0 },
      stack: { type: null, count: 0, max: BALANCE.player.stack.max },
      input: { move: { x: 0, z: 0 } },
    },
    bears: [],
    fence: { segments: createFenceSegments() },
    meatRaw: [],
    meatCooked: [],
    fire: { pos: null, cooking: [], capacity: BALANCE.fire.capacity },
    register: { pos: null, counterStack: 0, moneyPiles: [] },
    customers: [],
    money: { pocket: 0 },
    upgradePads: [],
    employees: [],
    nextId: 0,
  };
}

function createFenceSegments() {
  const segments = [];
  const r = BALANCE.base.radius;
  const n = BALANCE.fence.segments;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    segments.push({
      id: i,
      pos: { x: Math.cos(angle) * r, z: Math.sin(angle) * r },
      rot: angle,
      hp: BALANCE.fence.hpPerSegment,
      broken: false,
    });
  }
  return segments;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm run test:ci -- tests/world.test.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world.js tests/world.test.js
git commit -m "Phase 1.3: world factory with player, fence, empty entity arrays"
```

---

## Task 4: Save/load to LocalStorage + test

**Files:**
- Modify: `src/world.js`
- Modify: `tests/world.test.js`

- [ ] **Step 1: Write failing test** — append to `tests/world.test.js`

```js
import { saveWorld, loadWorld, SAVE_KEY } from '../src/world.js';
import { BALANCE_VERSION } from '../src/balance.js';

// Mock localStorage for node environment
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

describe('save/load', () => {
  it('SAVE_KEY is versioned', () => {
    expect(SAVE_KEY).toBe('bmt:save:v1');
  });

  it('saveWorld persists only the saved-fields whitelist', () => {
    const storage = new MockStorage();
    const w = createWorld();
    w.money.pocket = 1234;
    w.fence.segments[0].hp = 50;
    w.fence.segments[1].broken = true;
    w.time.elapsed = 99;
    w.bears.push({ id: 5, pos: { x: 1, z: 2 }, hp: 70 }); // ephemeral, must NOT save

    saveWorld(w, storage);
    const raw = storage.getItem('bmt:save:v1');
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(BALANCE_VERSION);
    expect(parsed.money.pocket).toBe(1234);
    expect(parsed.fence.segments[0].hp).toBe(50);
    expect(parsed.fence.segments[1].broken).toBe(true);
    expect(parsed.time.elapsed).toBe(99);
    expect(parsed.bears).toBeUndefined();
    expect(parsed.player).toBeUndefined();
  });

  it('loadWorld restores saved fields onto a fresh world', () => {
    const storage = new MockStorage();
    storage.setItem('bmt:save:v1', JSON.stringify({
      version: BALANCE_VERSION,
      money: { pocket: 500 },
      fence: { segments: Array(16).fill(0).map((_, i) => ({ id: i, hp: 75, broken: false })) },
      time: { elapsed: 42 },
      upgradePads: [],
      employees: [],
    }));

    const w = createWorld();
    loadWorld(w, storage);
    expect(w.money.pocket).toBe(500);
    expect(w.time.elapsed).toBe(42);
    expect(w.fence.segments[0].hp).toBe(75);
    // ephemeral state is untouched
    expect(w.player.hp).toBe(100);
    expect(w.bears).toEqual([]);
  });

  it('loadWorld no-ops when no save exists', () => {
    const storage = new MockStorage();
    const w = createWorld();
    loadWorld(w, storage);
    expect(w.money.pocket).toBe(0);
  });

  it('loadWorld no-ops when version mismatches', () => {
    const storage = new MockStorage();
    storage.setItem('bmt:save:v1', JSON.stringify({ version: 999, money: { pocket: 9999 } }));
    const w = createWorld();
    loadWorld(w, storage);
    expect(w.money.pocket).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm run test:ci -- tests/world.test.js
```

Expected: FAIL with "saveWorld is not a function" (or similar).

- [ ] **Step 3: Add save/load to `src/world.js`** (append)

```js
import { BALANCE_VERSION } from './balance.js';

export const SAVE_KEY = 'bmt:save:v1';

export function saveWorld(world, storage = globalThis.localStorage) {
  if (!storage) return;
  const payload = {
    version: BALANCE_VERSION,
    money: { pocket: world.money.pocket },
    fence: {
      segments: world.fence.segments.map(s => ({
        id: s.id, hp: s.hp, broken: s.broken,
      })),
    },
    time: { elapsed: world.time.elapsed },
    upgradePads: world.upgradePads.map(p => ({
      id: p.id, type: p.type, deposited: p.deposited, completed: p.completed,
    })),
    employees: world.employees.map(e => ({ id: e.id, type: e.type })),
  };
  storage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function loadWorld(world, storage = globalThis.localStorage) {
  if (!storage) return;
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return;
  let saved;
  try { saved = JSON.parse(raw); } catch { return; }
  if (saved.version !== BALANCE_VERSION) return;

  if (saved.money) world.money.pocket = saved.money.pocket ?? 0;
  if (saved.time) world.time.elapsed = saved.time.elapsed ?? 0;
  if (saved.fence?.segments) {
    for (const seg of saved.fence.segments) {
      const target = world.fence.segments.find(s => s.id === seg.id);
      if (target) { target.hp = seg.hp; target.broken = seg.broken; }
    }
  }
  // upgradePads / employees restored in later phases when those systems exist
}
```

Also update the existing `import` line at top of `world.js` to include `BALANCE_VERSION`:

```js
import { BALANCE, BALANCE_VERSION } from './balance.js';
```

(remove the duplicate import if it ends up below).

- [ ] **Step 4: Run all tests**

```bash
npm run test:ci
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world.js tests/world.test.js
git commit -m "Phase 1.4: saveWorld/loadWorld with version gate and field whitelist"
```

---

## Task 5: Player movement system + test

**Files:**
- Create: `src/systems/player.js`
- Create: `tests/systems/player.test.js`

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updatePlayer } from '../../src/systems/player.js';

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
    expect(w.player.rot).toBeCloseTo(Math.atan2(1, 0), 5);
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
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm run test:ci -- tests/systems/player.test.js
```

Expected: FAIL with "Cannot find module '../../src/systems/player.js'".

- [ ] **Step 3: Create `src/systems/player.js`**

```js
export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;

  let mx = p.input.move.x;
  let mz = p.input.move.z;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (len > 0.001) {
    p.pos.x += mx * p.speed * dt;
    p.pos.z += mz * p.speed * dt;
    p.rot = Math.atan2(mx, mz);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm run test:ci
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/player.js tests/systems/player.test.js
git commit -m "Phase 1.5: player movement system with normalized input and rotation"
```

---

## Task 6: Game loop module

**Files:**
- Create: `src/loop.js`

- [ ] **Step 1: Create `src/loop.js`**

```js
const MAX_DT = 1 / 30; // clamp to 30fps minimum to avoid huge jumps after tab-resume

export function startLoop(world, systems, render, onFrame) {
  let lastTime = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > MAX_DT) dt = MAX_DT;

    world.time.dt = dt;
    world.time.elapsed += dt;
    world.time.frameCount++;

    for (const system of systems) system(world, dt);
    render(world);
    if (onFrame) onFrame(world);

    requestAnimationFrame(frame);
  }

  // pause on visibility change to avoid huge dt on resume
  const onVisibility = () => {
    if (document.hidden) running = false;
    else { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  requestAnimationFrame(frame);

  return {
    stop() { running = false; document.removeEventListener('visibilitychange', onVisibility); },
  };
}
```

(No tests for this module — depends on `requestAnimationFrame` and `document` which are browser-only. Behavior validated indirectly through integration smoke test on iPhone.)

- [ ] **Step 2: Commit**

```bash
git add src/loop.js
git commit -m "Phase 1.6: game loop with fixed-dt clamp and visibility pause"
```

---

## Task 7: Three.js scene + ground

**Files:**
- Create: `src/render/scene.js`

- [ ] **Step 1: Create `src/render/scene.js`**

```js
import * as THREE from 'three';
import { BALANCE } from '../balance.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1410);
  scene.fog = new THREE.Fog(0x1a1410, 25, 60);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0c8, 1.0);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  scene.add(sun);

  // Ground plane — slightly larger than play area
  const groundSize = (BALANCE.base.radius + 10) * 2;
  const groundGeo = new THREE.CircleGeometry(groundSize / 2, 48);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a6a3a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  return scene;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  return renderer;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/scene.js
git commit -m "Phase 1.7: Three.js scene with lights, fog, ground"
```

---

## Task 8: Player primitive mesh

**Files:**
- Create: `src/render/meshes.js`

- [ ] **Step 1: Create `src/render/meshes.js`**

```js
import * as THREE from 'three';

export function createPlayerMesh() {
  const group = new THREE.Group();

  // Body: capsule (cylinder + 2 spheres top/bottom — three.js capsule is fine in r0.160+)
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Head: sphere
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8c8a0 })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  // Axe — visible cue that player has weapon, even at foundation phase
  const axeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b3f1d })
  );
  axeHandle.position.set(0.5, 0.9, 0.05);
  axeHandle.rotation.z = Math.PI / 4;
  axeHandle.castShadow = true;
  group.add(axeHandle);

  const axeHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.18, 0.04),
    new THREE.MeshLambertMaterial({ color: 0x9a9a9a })
  );
  axeHead.position.set(0.74, 1.16, 0.05);
  axeHead.castShadow = true;
  group.add(axeHead);

  return group;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/meshes.js
git commit -m "Phase 1.8: player primitive mesh (capsule + head + axe)"
```

---

## Task 9: Camera follow

**Files:**
- Create: `src/camera.js`

- [ ] **Step 1: Create `src/camera.js`**

```js
import * as THREE from 'three';

const FOV = 35;
const DISTANCE = 18;
const ANGLE_RAD = Math.PI / 180 * 55;
const FOLLOW_LERP = 0.08;

export function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100);
  camera.lookAtTarget = { x: 0, z: 0 };
  return camera;
}

export function updateCamera(camera, world) {
  const t = camera.lookAtTarget;
  t.x += (world.player.pos.x - t.x) * FOLLOW_LERP;
  t.z += (world.player.pos.z - t.z) * FOLLOW_LERP;

  // Camera offset behind+above target
  const offsetXZ = DISTANCE * Math.cos(ANGLE_RAD);
  const offsetY = DISTANCE * Math.sin(ANGLE_RAD);

  camera.position.set(t.x, offsetY, t.z + offsetXZ);
  camera.lookAt(t.x, 0, t.z);
}

export function handleResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/camera.js
git commit -m "Phase 1.9: follow camera with smooth lerp and resize handler"
```

---

## Task 10: Virtual joystick input

**Files:**
- Create: `src/input.js`

- [ ] **Step 1: Create `src/input.js`**

```js
const RADIUS = 70;          // px
const DEADZONE = 0.15;
const STICK_SIZE = 80;      // base diameter px

export function setupJoystick(world, container = document.body) {
  // DOM elements
  const base = document.createElement('div');
  base.id = 'joystick-base';
  base.style.cssText = `
    position: fixed;
    left: calc(env(safe-area-inset-left, 0px) + 24px);
    bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    width: ${STICK_SIZE * 2}px;
    height: ${STICK_SIZE * 2}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 2px solid rgba(255,255,255,0.2);
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    z-index: 10;
  `;
  const stick = document.createElement('div');
  stick.id = 'joystick-stick';
  stick.style.cssText = `
    position: absolute;
    left: 50%; top: 50%;
    width: ${STICK_SIZE}px;
    height: ${STICK_SIZE}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  `;
  base.appendChild(stick);
  container.appendChild(base);

  let activeId = null;
  let centerX = 0, centerY = 0;

  function onStart(e) {
    if (activeId !== null) return;
    const t = e.changedTouches[0];
    activeId = t.identifier;
    const rect = base.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    onMove(e);
  }

  function onMove(e) {
    if (activeId === null) return;
    let touch = null;
    for (const t of e.changedTouches) {
      if (t.identifier === activeId) { touch = t; break; }
    }
    if (!touch) return;
    e.preventDefault();

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const max = RADIUS;
    const clamped = Math.min(dist, max);
    if (dist > 0) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }
    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    let nx = dx / max;
    let ny = dy / max;
    if (Math.hypot(nx, ny) < DEADZONE) { nx = 0; ny = 0; }
    world.player.input.move.x = nx;
    world.player.input.move.z = ny; // screen-y → world-z (camera 3/4 mapping)
  }

  function onEnd(e) {
    let found = false;
    for (const t of e.changedTouches) {
      if (t.identifier === activeId) { found = true; break; }
    }
    if (!found) return;
    activeId = null;
    stick.style.transform = `translate(-50%, -50%)`;
    world.player.input.move.x = 0;
    world.player.input.move.z = 0;
  }

  base.addEventListener('touchstart', onStart, { passive: false });
  base.addEventListener('touchmove', onMove, { passive: false });
  base.addEventListener('touchend', onEnd);
  base.addEventListener('touchcancel', onEnd);

  // Keyboard fallback for desktop dev
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key] = true; updateKeys(); });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; updateKeys(); });
  function updateKeys() {
    let kx = (keys['d'] || keys['ArrowRight'] ? 1 : 0) - (keys['a'] || keys['ArrowLeft'] ? 1 : 0);
    let ky = (keys['s'] || keys['ArrowDown'] ? 1 : 0) - (keys['w'] || keys['ArrowUp'] ? 1 : 0);
    world.player.input.move.x = kx;
    world.player.input.move.z = ky;
  }
}
```

(No unit test for this — pure DOM event handling, validated on real device.)

- [ ] **Step 2: Commit**

```bash
git add src/input.js
git commit -m "Phase 1.10: virtual joystick with touch + keyboard fallback"
```

---

## Task 11: HUD overlay (money counter)

**Files:**
- Create: `src/ui.js`

- [ ] **Step 1: Create `src/ui.js`**

```js
export function setupHud(container = document.body) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.cssText = `
    position: fixed;
    top: env(safe-area-inset-top, 0px);
    left: env(safe-area-inset-left, 0px);
    right: env(safe-area-inset-right, 0px);
    padding: 12px 16px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 18px;
    font-weight: 600;
    pointer-events: none;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  `;
  const moneyEl = document.createElement('div');
  moneyEl.id = 'hud-money';
  moneyEl.textContent = '💰 $0';
  hud.appendChild(moneyEl);

  const hpEl = document.createElement('div');
  hpEl.id = 'hud-hp';
  hpEl.textContent = '❤️ 100';
  hud.appendChild(hpEl);

  container.appendChild(hud);

  return {
    update(world) {
      moneyEl.textContent = `💰 $${world.money.pocket}`;
      hpEl.textContent = `❤️ ${Math.max(0, Math.round(world.player.hp))}`;
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.js
git commit -m "Phase 1.11: HUD overlay with money and HP"
```

---

## Task 12: index.html with iOS PWA meta + manifest

**Files:**
- Create: `index.html`
- Create: `public/manifest.webmanifest`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="BearMeat" />
  <meta name="theme-color" content="#1a1410" />
  <link rel="apple-touch-icon" href="/mobile-game/icons/apple-touch-icon-180.png" />
  <link rel="manifest" href="/mobile-game/manifest.webmanifest" />
  <title>Bear Meat Tycoon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1410; }
    body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `public/manifest.webmanifest`**

```json
{
  "name": "Bear Meat Tycoon",
  "short_name": "BearMeat",
  "start_url": "/mobile-game/",
  "scope": "/mobile-game/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1410",
  "theme_color": "#1a1410",
  "icons": [
    { "src": "/mobile-game/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/mobile-game/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/mobile-game/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 3: Add placeholder icons**

Generate or place 3 PNG files in `public/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `apple-touch-icon-180.png` (180×180)
- `maskable-512.png` (512×512)

If no icons available, generate solid-colour squares with the letter "B":

```bash
# If ImageMagick is available:
mkdir -p public/icons
for size in 192 512; do
  convert -size ${size}x${size} xc:'#1a1410' -fill '#c8a878' -gravity center -pointsize $((size/2)) -annotate 0 'B' "public/icons/icon-${size}.png"
done
convert -size 180x180 xc:'#1a1410' -fill '#c8a878' -gravity center -pointsize 90 -annotate 0 'B' "public/icons/apple-touch-icon-180.png"
cp public/icons/icon-512.png public/icons/maskable-512.png
```

If ImageMagick isn't available, manually create 4 placeholder PNG files (any solid colour squares are fine for now).

- [ ] **Step 4: Commit**

```bash
git add index.html public/
git commit -m "Phase 1.12: index.html with iOS PWA meta + manifest + placeholder icons"
```

---

## Task 13: main.js — bootstrap everything

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Create `src/main.js`**

```js
import * as THREE from 'three';
import { createWorld, saveWorld, loadWorld } from './world.js';
import { update as updatePlayer } from './systems/player.js';
import { startLoop } from './loop.js';
import { createScene, createRenderer } from './render/scene.js';
import { createPlayerMesh } from './render/meshes.js';
import { createCamera, updateCamera, handleResize } from './camera.js';
import { setupJoystick } from './input.js';
import { setupHud } from './ui.js';

const canvas = document.getElementById('game');
const world = createWorld();
loadWorld(world);

const scene = createScene();
const renderer = createRenderer(canvas);
const camera = createCamera();

const playerMesh = createPlayerMesh();
scene.add(playerMesh);

setupJoystick(world);
const hud = setupHud();

window.addEventListener('resize', () => handleResize(camera, renderer));

// Auto-save every 5 seconds
let saveTimer = 0;
function autoSave(world) {
  saveTimer += world.time.dt;
  if (saveTimer >= 5) { saveWorld(world); saveTimer = 0; }
}

const systems = [updatePlayer];
function render(world) {
  playerMesh.position.set(world.player.pos.x, 0, world.player.pos.z);
  playerMesh.rotation.y = world.player.rot;
  updateCamera(camera, world);
  hud.update(world);
  renderer.render(scene, camera);
}

startLoop(world, systems, render, autoSave);

// Save on unload as a safety net
window.addEventListener('pagehide', () => saveWorld(world));
```

- [ ] **Step 2: Run dev server, verify load**

```bash
npm run dev
```

Open `http://localhost:5173/mobile-game/` in browser. Expected:
- Brown ground visible.
- Capsule player with axe in centre.
- Camera looks down at player from 3/4 angle.
- Arrow keys / WASD move the player.
- Money counter shows `💰 $0`, HP shows `❤️ 100` in top corners.

Stop dev server with Ctrl+C.

- [ ] **Step 3: Run test suite**

```bash
npm run test:ci
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "Phase 1.13: main.js wires scene, world, systems, joystick, HUD, autosave"
```

---

## Task 14: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable Pages in GitHub repo settings**

This is a one-time manual step that the user must do:
1. Open `https://github.com/damboskill-blip/mobile-game/settings/pages`
2. Set Source = "GitHub Actions".

(No script can do this — note in plan output for the user.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Phase 1.14: GitHub Actions workflow for test + build + deploy to Pages"
```

---

## Task 15: Final smoke test on iPhone

This task is purely manual; no code.

- [ ] **Step 1: Push the feature branch**

Implementation branch convention for all phases: **`feat/game-mvp`**. Tasks 1–14 should be committed there.

```bash
git push -u origin feat/game-mvp
```

Wait for CI test job to finish (Actions tab). Verify green.

- [ ] **Step 2: Open PR feat/game-mvp → main, merge**

```bash
# (via mcp__github__create_pull_request or GitHub UI)
```

After merge, wait for the `deploy` workflow on `main` to publish to Pages.

- [ ] **Step 3: Open on iPhone**

Open `https://damboskill-blip.github.io/mobile-game/` in Safari.

Expected:
- Brown ground.
- Player capsule + axe in centre.
- Camera 3/4 view.
- Touch + drag joystick (bottom-left) → player moves.
- Camera follows.
- HUD shows `💰 $0` and `❤️ 100`.
- Page works in portrait, scales to safe areas.

- [ ] **Step 4: Add to Home Screen and verify standalone mode**

Safari → Share → Add to Home Screen. Tap the new icon. Expected: opens fullscreen without Safari UI.

- [ ] **Step 5: Verify save persistence**

(Once gameplay accrues money in later phases, this is the real save test. For Phase 1, money stays at $0, so all we can verify is that no errors occur when LocalStorage is written and read.)

Open Safari devtools (or just trust the no-error assumption since `world.money.pocket = 0` will round-trip correctly).

- [ ] **Step 6: Tag the milestone**

```bash
git tag phase1-foundation
git push origin phase1-foundation
```

---

## Acceptance criteria for Phase 1

- [ ] `npm run test:ci` passes locally and in GitHub Actions.
- [ ] `npm run build` produces a `dist/` directory.
- [ ] GitHub Actions deploy workflow succeeds.
- [ ] On iPhone Safari: page loads, joystick moves player, camera follows, HUD visible.
- [ ] On iPhone home screen: app opens fullscreen with no Safari UI.
- [ ] No console errors in Safari.

When all 6 boxes ticked → Phase 1 done. Move to Phase 2 plan (Combat: bears, fence, axe, death/respawn).

---

## Out of scope for Phase 1 (deferred)

- Bears, fence rendering, combat — Phase 2.
- Meat, fire, cooking — Phase 3.
- Customers, register — Phase 4.
- Upgrade pads, employees — Phase 5.
- Audio, full save (only money saves), iOS polish details — Phase 6.
- CC0 model loading (`src/assets.js`) — currently using primitives; models swap in Phase 2 or 6.
