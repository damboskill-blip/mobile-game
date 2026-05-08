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
    p.rot = Math.atan2(mz, mx);
  }
}
