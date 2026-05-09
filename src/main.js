import * as THREE from 'three';
import { createWorld, saveWorld, loadWorld } from './world.js';
import { update as updatePlayer } from './systems/player.js';
import { update as updateBear } from './systems/bear.js';
import { update as updateFence } from './systems/fence.js';
import { update as updateFire } from './systems/fire.js';
import { update as updateMeat } from './systems/meat.js';
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
import { setupHud } from './ui.js';

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

const systems = [updateBear, updateFence, updateFire, updatePlayer, updateMeat];

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

  updateCamera(camera, world, world.time.dt);
  tickFireFlicker(fireMesh, world.time.elapsed);
  hud.update(world);
  renderer.render(scene, camera);
}

startLoop(world, systems, render, autoSave);

window.addEventListener('pagehide', () => saveWorld(world));
