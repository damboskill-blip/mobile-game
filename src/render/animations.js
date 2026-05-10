const BOB_FREQUENCY = 7;       // hz approximately
const BOB_AMPLITUDE = 0.11;
const MOVE_THRESHOLD = 0.001;  // squared distance per frame to count as moving

const lastPositions = new WeakMap();
const phases = new WeakMap();

const swingState = new WeakMap();
const SWING_DURATION = 0.25;

export function triggerAxeSwing(playerMesh) {
  swingState.set(playerMesh, SWING_DURATION);
}

export function updateAxeSwing(playerMesh, dt) {
  const axeGroup = playerMesh.userData.axeGroup;
  if (!axeGroup) return;
  const t = swingState.get(playerMesh) || 0;
  if (t > 0) {
    const newT = Math.max(0, t - dt);
    swingState.set(playerMesh, newT);
    // Swing arc: rotate axeGroup.x from -0.6 → +0.4 over duration
    const progress = 1 - (newT / SWING_DURATION);
    axeGroup.rotation.x = -0.6 + progress * 1.2;
  } else {
    axeGroup.rotation.x = 0;
  }
}

export function applyWalkBob(mesh, currentX, currentZ, dt) {
  const last = lastPositions.get(mesh);
  let moving = false;
  if (last) {
    const dx = currentX - last.x;
    const dz = currentZ - last.z;
    moving = (dx * dx + dz * dz) > MOVE_THRESHOLD;
  }
  lastPositions.set(mesh, { x: currentX, z: currentZ });

  let phase = phases.get(mesh) || 0;
  if (moving) {
    phase += dt * BOB_FREQUENCY * 2 * Math.PI;
    phases.set(mesh, phase);
    mesh.position.y = Math.abs(Math.sin(phase)) * BOB_AMPLITUDE;
  } else {
    // Decay back to 0
    mesh.position.y *= Math.max(0, 1 - dt * 6);
  }
}
