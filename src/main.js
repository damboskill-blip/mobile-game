import * as THREE from 'three';
import { createWorld, saveWorld, loadWorld } from './world.js';
import { update as updatePlayer } from './systems/player.js';
import { update as updateBear } from './systems/bear.js';
import { update as updateFence } from './systems/fence.js';
import { update as updateFire } from './systems/fire.js';
import { update as updateTannery } from './systems/tannery.js';
import { update as updateMeat } from './systems/meat.js';
import { update as updateCustomer } from './systems/customer.js';
import { update as updateLeatherCustomer } from './systems/leather-customer.js';
import { update as updateMoney } from './systems/money.js';
import { createRegisterMesh, syncRegisterStack } from './render/register-mesh.js';
import { createCustomerMesh } from './render/customer-mesh.js';
import { createPremiumCustomerMesh } from './render/customer-mesh.js';
import { createMoneyMesh } from './render/money-mesh.js';
import { startLoop } from './loop.js';
import { createScene, createRenderer } from './render/scene.js';
import { createPlayerMesh } from './render/meshes.js';
import { createFenceSegmentMesh, applyFenceSegmentTransform } from './render/fence-mesh.js';
import { createFireMesh, tickFireFlicker, syncFireQueueStack } from './render/fire-mesh.js';
import { createBearMesh } from './render/bear-mesh.js';
import { createMeatMesh } from './render/meat-mesh.js';
import { createPeltMesh } from './render/pelt-mesh.js';
import { createLeatherMesh } from './render/leather-mesh.js';
import { createTanneryMesh, syncTanneryQueueStack } from './render/tannery-mesh.js';
import { createLeatherCounterMesh, syncLeatherCounterStack } from './render/leather-counter-mesh.js';
import { createStackGroups, syncStackMesh } from './render/stack-mesh.js';
import { createCamera, updateCamera, handleResize } from './camera.js';
import { setupJoystick } from './input.js';
import { update as updateUpgradePad } from './systems/upgrade-pad.js';
import { update as updateEmployee } from './systems/employee.js';
import { update as updateTower } from './systems/tower.js';
import { createPadMesh, syncPadMesh } from './render/pad-mesh.js';
import { createEmployeeMesh } from './render/employee-mesh.js';
import { createTowerMesh, applyTowerLevel, setTowerRotationToTarget } from './render/tower-mesh.js';
import { setupHud, setupPadLabels } from './ui.js';
import { createSmokeEmitter, updateSmoke } from './render/smoke.js';
import { createSuperviseRing } from './render/supervise-ring.js';
import { BALANCE } from './balance.js';
import { triggerShake, applyShake } from './render/camera-shake.js';
import { applyWalkBob, triggerAxeSwing, updateAxeSwing } from './render/animations.js';
import { spawnHitSparks, spawnMoneyPop, updateParticles } from './render/particles.js';
import { sfxChop, sfxKill, sfxPickup, sfxMoney, sfxSale, sfxDeposit, sfxHire, sfxFenceHit } from './audio.js';
import { setupHpBars } from './render/hp-bars.js';

const canvas = document.getElementById('game');
const world = createWorld();
loadWorld(world);

const scene = createScene();
const renderer = createRenderer(canvas);
const camera = createCamera();

// Player + back stack
const playerMesh = createPlayerMesh();
const stackGroups = createStackGroups();
playerMesh.add(stackGroups.raw);
playerMesh.add(stackGroups.cooked);
playerMesh.add(stackGroups.pelt);
playerMesh.add(stackGroups.leather);
scene.add(playerMesh);

// Fence — one mesh per segment, indexed by segment id
const fenceMeshes = new Map();
for (const seg of world.fence.segments) {
  const mesh = createFenceSegmentMesh();
  applyFenceSegmentTransform(mesh, seg);
  scene.add(mesh);
  fenceMeshes.set(seg.id, mesh);
}

// Fire mesh
const fireMesh = createFireMesh();
fireMesh.position.set(world.fire.pos.x, 0, world.fire.pos.z);
scene.add(fireMesh);

// Smoke emitter above fire
const fireSmoke = createSmokeEmitter();
fireSmoke.position.set(world.fire.pos.x, 0, world.fire.pos.z);
scene.add(fireSmoke);

// Supervise zone ring around fire
const fireRing = createSuperviseRing(BALANCE.fire.superviseRadius);
fireRing.position.set(world.fire.pos.x, 0, world.fire.pos.z);
scene.add(fireRing);

// Register mesh
const registerMesh = createRegisterMesh();
registerMesh.position.set(world.register.pos.x, 0, world.register.pos.z);
scene.add(registerMesh);

// Tannery mesh
const tanneryMesh = createTanneryMesh();
tanneryMesh.position.set(world.tannery.pos.x, 0, world.tannery.pos.z);
scene.add(tanneryMesh);

// Smoke emitter above tannery
const tannerySmoke = createSmokeEmitter();
tannerySmoke.position.set(world.tannery.pos.x, 0, world.tannery.pos.z);
scene.add(tannerySmoke);

// Supervise zone ring around tannery
const tanneryRing = createSuperviseRing(BALANCE.tannery.superviseRadius);
tanneryRing.position.set(world.tannery.pos.x, 0, world.tannery.pos.z);
scene.add(tanneryRing);

// Leather counter mesh
const leatherCounterMesh = createLeatherCounterMesh();
leatherCounterMesh.position.set(world.leatherCounter.pos.x, 0, world.leatherCounter.pos.z);
scene.add(leatherCounterMesh);

// Pad meshes
const padMeshes = new Map();
for (const pad of world.upgradePads) {
  const m = createPadMesh(pad.type);
  m.position.set(pad.pos.x, 0, pad.pos.z);
  scene.add(m);
  padMeshes.set(pad.id, m);
}

const employeeMeshes = new Map();
const towerMeshes = new Map();
const padLabels = setupPadLabels();

// Bears + meat — managed dynamically each frame
const bearMeshes = new Map();
const meatRawMeshes = new Map();
const meatCookedMeshes = new Map();
const customerMeshes = new Map();
const moneyMeshes = new Map();
const peltMeshes = new Map();
const leatherMeshes = new Map();
const premiumCustomerMeshes = new Map();
const leatherMoneyMeshes = new Map();

// Particle event tracking
const bearHpLast = new Map();
const moneyPosLast = new Map();

// SFX per-frame diff tracking
const lastBearIds = new Set();
const lastEmployeeIds = new Set();
let lastStackTotal = 0;
let lastRegisterStack = 0;
let lastLeatherStack = 0;
let lastDepositSum = 0;
let depositSfxCD = 0;

setupJoystick(world);
const hud = setupHud();
const hpBars = setupHpBars();

window.addEventListener('resize', () => handleResize(camera, renderer));

let saveTimer = 0;
function autoSave(world) {
  saveTimer += world.time.dt;
  if (saveTimer >= 5) { saveWorld(world); saveTimer = 0; }
}

let lastAxeCD = 0;

const systems = [updateBear, updateFence, updateFire, updateTannery, updateCustomer, updateLeatherCustomer, updatePlayer, updateMeat, updateMoney, updateUpgradePad, updateEmployee, updateTower];

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
    applyWalkBob(playerMesh, world.player.pos.x, world.player.pos.z, world.time.dt);
  } else {
    playerMesh.visible = false;
  }
  syncStackMesh(stackGroups, world.player.stack);

  // Axe swing detection: cooldownTimer just jumped from 0 to >0 means attack fired
  if (world.player.axe.cooldownTimer > lastAxeCD + 0.01) {
    triggerAxeSwing(playerMesh);
    sfxChop();
  }
  lastAxeCD = world.player.axe.cooldownTimer;
  updateAxeSwing(playerMesh, world.time.dt);

  // Fence
  for (const seg of world.fence.segments) {
    const mesh = fenceMeshes.get(seg.id);
    if (mesh) applyFenceSegmentTransform(mesh, seg);
  }

  // Bears
  syncEntityMeshes(world.bears, bearMeshes, scene, () => createBearMesh());

  // Bear walk-bob
  for (const b of world.bears) {
    const m = bearMeshes.get(b.id);
    if (m) applyWalkBob(m, b.pos.x, b.pos.z, world.time.dt);
  }

  // Bear damage sparks
  for (const b of world.bears) {
    const last = bearHpLast.get(b.id);
    if (last !== undefined && b.hp < last) {
      spawnHitSparks(scene, b.pos);
    }
    bearHpLast.set(b.id, b.hp);
  }
  // Cleanup map for dead bears
  for (const id of bearHpLast.keys()) {
    if (!world.bears.find(b => b.id === id)) bearHpLast.delete(id);
  }

  // Meat — raw and cooked, both keyed by id (no overlap)
  syncEntityMeshes(world.meatRaw, meatRawMeshes, scene, () => createMeatMesh('raw'));
  syncEntityMeshes(world.meatCooked, meatCookedMeshes, scene, () => createMeatMesh('cooked'));

  syncEntityMeshes(world.customers, customerMeshes, scene, () => createCustomerMesh());
  for (const c of world.customers) {
    const m = customerMeshes.get(c.id);
    if (m) applyWalkBob(m, c.pos.x, c.pos.z, world.time.dt);
  }

  syncEntityMeshes(world.register.moneyPiles, moneyMeshes, scene, () => createMoneyMesh());
  syncRegisterStack(registerMesh, world.register.counterStack);
  syncEntityMeshes(world.pelts, peltMeshes, scene, () => createPeltMesh());
  syncEntityMeshes(world.leather, leatherMeshes, scene, () => createLeatherMesh());

  syncEntityMeshes(world.premiumCustomers, premiumCustomerMeshes, scene, () => createPremiumCustomerMesh());
  for (const c of world.premiumCustomers) {
    const m = premiumCustomerMeshes.get(c.id);
    if (m) applyWalkBob(m, c.pos.x, c.pos.z, world.time.dt);
  }

  syncEntityMeshes(world.leatherCounter.moneyPiles, leatherMoneyMeshes, scene, () => createMoneyMesh());
  syncLeatherCounterStack(leatherCounterMesh, world.leatherCounter.counterStack);

  // Money-pile pickup detection (both registers)
  const allPiles = [...world.register.moneyPiles, ...world.leatherCounter.moneyPiles];
  const liveIds = new Set(allPiles.map(p => p.id));
  for (const [id, pos] of moneyPosLast) {
    if (!liveIds.has(id)) {
      spawnMoneyPop(scene, pos);
      sfxMoney();
      moneyPosLast.delete(id);
    }
  }
  for (const p of allPiles) {
    moneyPosLast.set(p.id, { x: p.pos.x, z: p.pos.z });
  }

  for (const pad of world.upgradePads) {
    const m = padMeshes.get(pad.id);
    if (m) syncPadMesh(m, pad);
  }
  syncEntityMeshes(world.employees, employeeMeshes, scene, (e) => createEmployeeMesh(e.type));
  for (const e of world.employees) {
    const m = employeeMeshes.get(e.id);
    if (m) applyWalkBob(m, e.pos.x, e.pos.z, world.time.dt);
  }
  syncEntityMeshes(world.towers, towerMeshes, scene, () => createTowerMesh());
  for (const tower of world.towers) {
    const m = towerMeshes.get(tower.id);
    if (!m) continue;
    applyTowerLevel(m, tower);
    // Rotate turret toward target
    if (tower.target) {
      const targetBear = world.bears.find(b => b.id === tower.target);
      if (targetBear) setTowerRotationToTarget(m, tower.pos, targetBear.pos);
    }
  }
  padLabels.sync(world, camera);
  updateCamera(camera, world, world.time.dt);
  tickFireFlicker(fireMesh, world.time.elapsed);
  syncFireQueueStack(fireMesh, world.fire.queue.length);
  syncTanneryQueueStack(tanneryMesh, world.tannery.queue.length);
  updateSmoke(fireSmoke, world.time.dt);
  updateSmoke(tannerySmoke, world.time.dt);
  if (world.pendingShake > 0) {
    triggerShake(world.pendingShake, 0.2);
    sfxFenceHit();
    world.pendingShake = 0;
  }
  applyShake(camera, world.time.dt);
  updateParticles(scene, world.time.dt);

  // SFX diff detection
  // Bear kills
  const currentBearIds = new Set(world.bears.map(b => b.id));
  for (const oldId of lastBearIds) if (!currentBearIds.has(oldId)) sfxKill();
  lastBearIds.clear();
  for (const id of currentBearIds) lastBearIds.add(id);

  // Pickups (any player stack value increased)
  const stackTotal = world.player.stack.raw + world.player.stack.cooked + world.player.stack.pelt + world.player.stack.leather;
  if (stackTotal > lastStackTotal) sfxPickup();
  lastStackTotal = stackTotal;

  // Sales
  if (world.register.counterStack < lastRegisterStack) sfxSale();
  lastRegisterStack = world.register.counterStack;
  if (world.leatherCounter.counterStack < lastLeatherStack) sfxSale();
  lastLeatherStack = world.leatherCounter.counterStack;

  // Hires
  const currentEmpIds = new Set(world.employees.map(e => e.id));
  for (const id of currentEmpIds) if (!lastEmployeeIds.has(id)) sfxHire();
  lastEmployeeIds.clear();
  for (const id of currentEmpIds) lastEmployeeIds.add(id);

  // Deposits (rate-limited to once per 0.4s)
  depositSfxCD -= world.time.dt;
  const depositSum = world.upgradePads.reduce((s, p) => s + p.deposited, 0);
  if (depositSum > lastDepositSum + 0.5 && depositSfxCD <= 0) {
    sfxDeposit();
    depositSfxCD = 0.4;
  }
  lastDepositSum = depositSum;

  hpBars.sync(world, camera);
  hud.update(world);
  renderer.render(scene, camera);
}

startLoop(world, systems, render, autoSave);

window.addEventListener('pagehide', () => saveWorld(world));
