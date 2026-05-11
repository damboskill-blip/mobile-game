import { isAudioEnabled, setAudioEnabled, loadAudioPref } from './audio.js';

export function setupHud(container = document.body) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.cssText = `
    position: fixed;
    top: env(safe-area-inset-top, 0px);
    left: env(safe-area-inset-left, 0px);
    right: env(safe-area-inset-right, 0px);
    padding: 12px 16px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 18px;
    font-weight: 600;
    pointer-events: none;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  `;
  const moneyEl = document.createElement('div');
  moneyEl.id = 'hud-money';
  moneyEl.textContent = '💰 $0';
  hud.appendChild(moneyEl);

  const hpEl = document.createElement('div');
  hpEl.id = 'hud-hp';
  hpEl.textContent = '❤️ 100';
  hud.appendChild(hpEl);

  container.appendChild(hud);

  // Audio toggle button (top-right, pointer-events enabled)
  loadAudioPref();
  const audioBtn = document.createElement('button');
  audioBtn.id = 'audio-toggle';
  audioBtn.style.cssText = 'position:fixed; top:env(safe-area-inset-top, 8px); right:env(safe-area-inset-right, 8px); padding:8px 12px; background:rgba(0,0,0,0.5); border:1px solid #fff; border-radius:8px; color:#fff; font-size:18px; z-index:100;';
  audioBtn.textContent = isAudioEnabled() ? '🔊' : '🔇';
  audioBtn.addEventListener('click', () => {
    setAudioEnabled(!isAudioEnabled());
    audioBtn.textContent = isAudioEnabled() ? '🔊' : '🔇';
  });
  container.appendChild(audioBtn);

  return {
    update(world) {
      moneyEl.textContent = `💰 $${world.money.pocket}`;
      hpEl.textContent = `❤️ ${Math.max(0, Math.round(world.player.hp))}`;
    },
  };
}

const PAD_TEXT = {
  'hire-cook': '🍳 Cook',
  'hire-cashier': '💼 Cashier',
  'hire-porter': '📦 Porter',
  'hire-repairman': '🔧 Repairman',
  'build-tower': '🏹 Tower',
  'hire-tanner': '🦌 Tanner',
};

export function setupPadLabels(container = document.body) {
  const labels = new Map();
  return {
    sync(world, camera) {
      // Ensure DOM elements exist for each pad
      for (const pad of world.upgradePads) {
        if (!labels.has(pad.id)) {
          const el = document.createElement('div');
          el.style.cssText = `
            position: fixed;
            transform: translate(-50%, -100%);
            padding: 4px 10px;
            background: rgba(0,0,0,0.65);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 5;
            text-shadow: 0 1px 2px rgba(0,0,0,0.6);
          `;
          container.appendChild(el);
          labels.set(pad.id, el);
        }
      }
      // Update content + screen position
      for (const pad of world.upgradePads) {
        const el = labels.get(pad.id);
        const text = PAD_TEXT[pad.type] || pad.type;
        if (pad.type === 'build-tower' && pad.level >= 3) {
          el.textContent = `${text} L3 ✓`;
          el.style.opacity = '0.55';
        } else if (pad.type === 'build-tower') {
          el.textContent = pad.deposited > 0
            ? `${text} L${pad.level + 1} · $${Math.round(pad.deposited)}/${pad.cost}`
            : `${text} L${pad.level + 1} · $${pad.cost}`;
          el.style.opacity = '1';
        } else if (pad.deposited > 0) {
          el.textContent = `${text} (${pad.hireCount}) · $${Math.round(pad.deposited)}/${pad.cost}`;
          el.style.opacity = '1';
        } else {
          el.textContent = `${text} (${pad.hireCount}) · $${pad.cost}`;
          el.style.opacity = '1';
        }
        // Project pad.pos to screen coords
        const v = padToScreen(pad.pos, camera);
        if (v) {
          el.style.left = `${v.x}px`;
          el.style.top = `${v.y - 50}px`;
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      }
    },
  };
}

function padToScreen(pos, camera) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Use a temporary vector
  const v = { x: pos.x, y: 0, z: pos.z };
  // Three.js project requires a Vector3; simulate manually:
  const m = camera.matrixWorldInverse;
  const px = m.elements[0]*v.x + m.elements[4]*v.y + m.elements[8]*v.z + m.elements[12];
  const py = m.elements[1]*v.x + m.elements[5]*v.y + m.elements[9]*v.z + m.elements[13];
  const pz = m.elements[2]*v.x + m.elements[6]*v.y + m.elements[10]*v.z + m.elements[14];
  const pw = m.elements[3]*v.x + m.elements[7]*v.y + m.elements[11]*v.z + m.elements[15];
  // Now apply projection
  const pm = camera.projectionMatrix;
  let cx = pm.elements[0]*px + pm.elements[4]*py + pm.elements[8]*pz + pm.elements[12]*pw;
  let cy = pm.elements[1]*px + pm.elements[5]*py + pm.elements[9]*pz + pm.elements[13]*pw;
  const cz = pm.elements[2]*px + pm.elements[6]*py + pm.elements[10]*pz + pm.elements[14]*pw;
  const cw = pm.elements[3]*px + pm.elements[7]*py + pm.elements[11]*pz + pm.elements[15]*pw;
  if (cw <= 0) return null; // behind camera
  cx /= cw;
  cy /= cw;
  return {
    x: (cx + 1) * 0.5 * w,
    y: (1 - (cy + 1) * 0.5) * h,
  };
}
