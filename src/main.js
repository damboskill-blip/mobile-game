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
  updateCamera(camera, world, world.time.dt);
  hud.update(world);
  renderer.render(scene, camera);
}

startLoop(world, systems, render, autoSave);

// Save on unload as a safety net
window.addEventListener('pagehide', () => saveWorld(world));
