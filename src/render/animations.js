const BOB_FREQUENCY = 6;       // hz approximately
const BOB_AMPLITUDE = 0.06;
const MOVE_THRESHOLD = 0.001;  // squared distance per frame to count as moving

const lastPositions = new WeakMap();
const phases = new WeakMap();

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
