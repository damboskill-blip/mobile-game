import { BALANCE } from '../balance.js';

export function damageFenceSegment(world, segmentId, amount) {
  const seg = world.fence.segments.find(s => s.id === segmentId);
  if (!seg || seg.broken) return;
  seg.hp = Math.max(0, seg.hp - amount);
  if (seg.hp === 0) seg.broken = true;
  world.pendingShake = Math.max(world.pendingShake || 0, 0.05);
}

export function repairAllSegments(world) {
  for (const s of world.fence.segments) {
    s.hp = BALANCE.fence.hpPerSegment;
    s.broken = false;
  }
}

export function update(world, dt) {
  // Currently no per-frame fence logic. Damage is applied externally by
  // the bear system; this hook exists for future regeneration / decay.
  void world; void dt;
}
