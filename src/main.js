import * as THREE from 'three';
import { createWorld, saveWorld, loadWorld } from './world.js';
import { update as updatePlayer } from './systems/player.js';
import { update as updateBear } from './systems/bear.js';
import { update as updateFence } from './systems/fence.js';
import { update as updateFire } from './systems/fire.js';
import { update as updateMeat } from './systems/meat.js';
import { update as updateCustomer } from './systems/customer.js';
import { update as updateMoney } from './systems/money.js';
import { createRegisterMesh, syncRegisterStack } from './render/register-mesh.js';
import { createCustomerMesh } from './render/customer-mesh.js';
import { createMoneyMesh } from './render/money-mesh.js';
import { startLoop } from './loop.js';
import { createScene, createRenderer } from './render/scene.js';
import { createPlayerMesh } from './render/meshes.js';
import { createFenceSegmentMesh, applyFenceSegmentTransform } from './render/fence-mesh.js';
import { createFireMesh, tickFireFlicker } from './render/fire-mesh.js';
import { createBearMesh } from './render/bear-mesh.js';
import { createMeatMesh } from './render/meat-mesh.js';
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

// Register mesh
const registerMesh = createRegisterMesh();
registerMesh.position.set(world.register.pos.x, 0, world.register.pos.z);
scene.add(registerMesh);

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
const meatMeshes = new Map();
const customerMeshes = new Map();
const moneyMeshes = new Map();

setupJoystick(world);
const hud = setupHud();

window.addEventListener('resize', () => handleResize(camera, renderer));

let saveTimer = 0;
function autoSave(world) {
  saveTimer += world.time.dt;
  if (saveTimer >= 5) { saveWorld(world); saveTimer = 0; }
}

const systems = [updateBear, updateFence, updateFire, updateCustomer, updatePlayer, updateMeat, updateMoney, updateUpgradePad, updateEmployee, updateTower];

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
  syncStackMesh(stackGroups, world.player.stack);

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

  syncEntityMeshes(world.customers, customerMeshes, scene, () => createCustomerMesh());
  syncEntityMeshes(world.register.moneyPiles, moneyMeshes, scene, () => createMoneyMesh());
  syncRegisterStack(registerMesh, world.register.counterStack);
  for (const pad of world.upgradePads) {
    const m = padMeshes.get(pad.id);
    if (m) syncPadMesh(m, pad);
  }
  syncEntityMeshes(world.employees, employeeMeshes, scene, (e) => createEmployeeMesh(e.type));
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
  hud.update(world);
  renderer.render(scene, camera);
}

startLoop(world, systems, render, autoSave);

window.addEventListener('pagehide', () => saveWorld(world));
