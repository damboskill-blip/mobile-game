import * as THREE from 'three';

const _v = new THREE.Vector3();

function createBar(width, color = '#4dff4d') {
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed; pointer-events:none; width:${width}px; height:6px; background:rgba(0,0,0,0.5); border-radius:3px; transform:translate(-50%, -50%); z-index:50;`;
  const fill = document.createElement('div');
  fill.style.cssText = `width:100%; height:100%; background:${color}; border-radius:3px;`;
  wrap.appendChild(fill);
  document.body.appendChild(wrap);
  return { wrap, fill };
}

function projectToScreen(camera, x, y, z) {
  _v.set(x, y, z);
  _v.project(camera);
  const sx = (_v.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-_v.y * 0.5 + 0.5) * window.innerHeight;
  return { x: sx, y: sy, behind: _v.z > 1 };
}

export function setupHpBars() {
  const fenceBars = new Map();   // id → { wrap, fill }
  const bearBars = new Map();
  const playerBar = createBar(60);
  playerBar.wrap.style.display = 'none';

  function syncBar(bar, hp, hpMax) {
    const ratio = Math.max(0, Math.min(1, hp / hpMax));
    bar.fill.style.width = (ratio * 100) + '%';
    if (ratio > 0.6) bar.fill.style.background = '#4dff4d';
    else if (ratio > 0.3) bar.fill.style.background = '#ffd154';
    else bar.fill.style.background = '#ff4040';
  }

  function projectBar(bar, camera, wx, wy, wz, visible) {
    if (!visible) { bar.wrap.style.display = 'none'; return; }
    const s = projectToScreen(camera, wx, wy, wz);
    if (s.behind) { bar.wrap.style.display = 'none'; return; }
    bar.wrap.style.display = 'block';
    bar.wrap.style.left = s.x + 'px';
    bar.wrap.style.top = s.y + 'px';
  }

  function sync(world, camera) {
    // Fence segments
    const damagedIds = new Set();
    for (const seg of world.fence.segments) {
      const damaged = !seg.broken && seg.hp < 100; // 100 is hpPerSegment
      if (!damaged) continue;
      damagedIds.add(seg.id);
      let bar = fenceBars.get(seg.id);
      if (!bar) {
        bar = createBar(40);
        fenceBars.set(seg.id, bar);
      }
      syncBar(bar, seg.hp, 100);
      projectBar(bar, camera, seg.pos.x, 1.8, seg.pos.z, true);
    }
    // Cleanup undamaged or removed
    for (const [id, bar] of fenceBars) {
      if (!damagedIds.has(id)) {
        bar.wrap.remove();
        fenceBars.delete(id);
      }
    }

    // Bears
    const bearIds = new Set();
    for (const b of world.bears) {
      const damaged = b.hp < b.hpMax;
      if (!damaged) continue;
      bearIds.add(b.id);
      let bar = bearBars.get(b.id);
      if (!bar) {
        bar = createBar(50);
        bearBars.set(b.id, bar);
      }
      syncBar(bar, b.hp, b.hpMax);
      projectBar(bar, camera, b.pos.x, 1.6, b.pos.z, true);
    }
    for (const [id, bar] of bearBars) {
      if (!bearIds.has(id)) {
        bar.wrap.remove();
        bearBars.delete(id);
      }
    }

    // Player
    const p = world.player;
    const showPlayer = p.state === 'alive' && p.hp < p.hpMax * 0.8;
    syncBar(playerBar, p.hp, p.hpMax);
    projectBar(playerBar, camera, p.pos.x, 2.2, p.pos.z, showPlayer);
  }

  return { sync };
}
