import * as THREE from 'three';

const BOB_FREQUENCY = 8;
const BOB_AMPLITUDE = 0.30;
const BOB_SCALE_PULSE = 0.06;
const MOVE_THRESHOLD = 0.001;

// Procedural walk cycle for humanoid skinned meshes — arms and legs
// swing back-and-forth around the shoulder/hip in opposite phase.
const ARM_SWING_AMP = 0.55;
const LEG_SWING_AMP = 0.65;

const lastPositions = new WeakMap();
const phases = new WeakMap();
const swingAmounts = new WeakMap();
const bindQuaternions = new WeakMap();

const swingState = new WeakMap();
const SWING_DURATION = 0.4;
const SWING_ARC = 2.2;
const SWING_START = -1.1;

const _axisZ = new THREE.Vector3(0, 0, 1);
const _axisX = new THREE.Vector3(1, 0, 0);
const _tmpQ = new THREE.Quaternion();

function makeArmDownDelta(zSign) {
  const q = new THREE.Quaternion().setFromAxisAngle(_axisZ, zSign * (Math.PI / 2.2));
  const forward = new THREE.Quaternion().setFromAxisAngle(_axisX, -Math.PI / 7);
  return q.multiply(forward);
}

const ARM_DOWN_L = makeArmDownDelta(1);
const ARM_DOWN_R = makeArmDownDelta(-1);

// Per-bone configuration: which bones to pose, what rest delta to apply,
// and how to swing them during a walk cycle.
const BONE_CONFIG = {
  ShoulderL:    { rest: ARM_DOWN_L, swingSign:  1, amp: ARM_SWING_AMP },
  'Shoulder.L': { rest: ARM_DOWN_L, swingSign:  1, amp: ARM_SWING_AMP },
  ShoulderR:    { rest: ARM_DOWN_R, swingSign: -1, amp: ARM_SWING_AMP },
  'Shoulder.R': { rest: ARM_DOWN_R, swingSign: -1, amp: ARM_SWING_AMP },
  // Legs: no rest delta (bind pose has them straight down); swing opposite
  // to corresponding arm so the gait reads as walking, not waving.
  UpperLegL:    { rest: null, swingSign: -1, amp: LEG_SWING_AMP },
  'UpperLeg.L': { rest: null, swingSign: -1, amp: LEG_SWING_AMP },
  UpperLegR:    { rest: null, swingSign:  1, amp: LEG_SWING_AMP },
  'UpperLeg.R': { rest: null, swingSign:  1, amp: LEG_SWING_AMP },
};

function applyHumanBones(mesh, phase, swingAmount) {
  let touched = false;
  mesh.traverse(child => {
    if (!child.isSkinnedMesh || !child.skeleton) return;
    for (const bone of child.skeleton.bones) {
      if (!bone) continue;
      const cfg = BONE_CONFIG[bone.name];
      if (!cfg) continue;
      let bind = bindQuaternions.get(bone);
      if (!bind) {
        bind = bone.quaternion.clone();
        bindQuaternions.set(bone, bind);
      }
      bone.quaternion.copy(bind);
      if (cfg.rest) bone.quaternion.multiply(cfg.rest);
      if (swingAmount > 0.001) {
        const angle = Math.sin(phase) * cfg.amp * cfg.swingSign * swingAmount;
        _tmpQ.setFromAxisAngle(_axisX, angle);
        bone.quaternion.multiply(_tmpQ);
      }
      touched = true;
    }
    if (touched) child.skeleton.update();
  });
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
  let swingAmount = swingAmounts.get(mesh) || 0;

  if (moving) {
    phase += dt * BOB_FREQUENCY * 2 * Math.PI;
    phases.set(mesh, phase);
    const bob = Math.abs(Math.sin(phase));
    mesh.position.y = bob * BOB_AMPLITUDE;
    const sy = 1 - bob * BOB_SCALE_PULSE;
    const sxy = 1 + bob * BOB_SCALE_PULSE * 0.5;
    mesh.scale.set(sxy, sy, sxy);
    swingAmount = Math.min(1, swingAmount + dt * 6);
  } else {
    mesh.position.y *= Math.max(0, 1 - dt * 6);
    const f = Math.min(1, dt * 8);
    mesh.scale.x += (1 - mesh.scale.x) * f;
    mesh.scale.y += (1 - mesh.scale.y) * f;
    mesh.scale.z += (1 - mesh.scale.z) * f;
    swingAmount = Math.max(0, swingAmount - dt * 4);
  }
  swingAmounts.set(mesh, swingAmount);

  // Always apply human bone pose so arms stay down even when idle.
  applyHumanBones(mesh, phase, swingAmount);
}

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
    const linear = 1 - (newT / SWING_DURATION);
    const eased = linear * linear;
    axeGroup.rotation.x = SWING_START + eased * SWING_ARC;
    axeGroup.rotation.z = -0.4 + eased * 0.6;
  } else {
    axeGroup.rotation.x = 0;
    axeGroup.rotation.z = 0;
  }
}
