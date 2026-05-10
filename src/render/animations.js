const BOB_FREQUENCY = 8;       // hz approximately
const BOB_AMPLITUDE = 0.30;
const BOB_SCALE_PULSE = 0.06;
const MOVE_THRESHOLD = 0.001;  // squared distance per frame to count as moving

const lastPositions = new WeakMap();
const phases = new WeakMap();

const swingState = new WeakMap();
const SWING_DURATION = 0.4;
const SWING_ARC = 2.2;       // total radians swept
const SWING_START = -1.1;    // starting angle (raised back)

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
    // Ease-in: slow start, fast strike
    const linear = 1 - (newT / SWING_DURATION);
    const eased = linear * linear;
    axeGroup.rotation.x = SWING_START + eased * SWING_ARC;
    // Also rotate Z slightly for compound chop visible from above
    axeGroup.rotation.z = -0.4 + eased * 0.6;
  } else {
    axeGroup.rotation.x = 0;
    axeGroup.rotation.z = 0;
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
    const bob = Math.abs(Math.sin(phase));
    mesh.position.y = bob * BOB_AMPLITUDE;
    // Scale squash-stretch for additional walk visibility
    const sy = 1 - bob * BOB_SCALE_PULSE;
    const sxy = 1 + bob * BOB_SCALE_PULSE * 0.5;
    mesh.scale.set(sxy, sy, sxy);
  } else {
    // Decay back to 0
    mesh.position.y *= Math.max(0, 1 - dt * 6);
    const f = Math.min(1, dt * 8);
    mesh.scale.x += (1 - mesh.scale.x) * f;
    mesh.scale.y += (1 - mesh.scale.y) * f;
    mesh.scale.z += (1 - mesh.scale.z) * f;
  }
}
