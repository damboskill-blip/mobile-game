const RADIUS = 70;          // px
const DEADZONE = 0.15;
const STICK_SIZE = 80;      // base diameter px

export function setupJoystick(world, container = document.body) {
  // DOM elements
  const base = document.createElement('div');
  base.id = 'joystick-base';
  base.style.cssText = `
    position: fixed;
    left: calc(env(safe-area-inset-left, 0px) + 24px);
    bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    width: ${STICK_SIZE * 2}px;
    height: ${STICK_SIZE * 2}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 2px solid rgba(255,255,255,0.2);
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    z-index: 10;
  `;
  const stick = document.createElement('div');
  stick.id = 'joystick-stick';
  stick.style.cssText = `
    position: absolute;
    left: 50%; top: 50%;
    width: ${STICK_SIZE}px;
    height: ${STICK_SIZE}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  `;
  base.appendChild(stick);
  container.appendChild(base);

  let activeId = null;
  let centerX = 0, centerY = 0;

  function onStart(e) {
    if (activeId !== null) return;
    const t = e.changedTouches[0];
    activeId = t.identifier;
    const rect = base.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    onMove(e);
  }

  function onMove(e) {
    if (activeId === null) return;
    let touch = null;
    for (const t of e.changedTouches) {
      if (t.identifier === activeId) { touch = t; break; }
    }
    if (!touch) return;
    e.preventDefault();

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const max = RADIUS;
    const clamped = Math.min(dist, max);
    if (dist > 0) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }
    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    let nx = dx / max;
    let ny = dy / max;
    if (Math.hypot(nx, ny) < DEADZONE) { nx = 0; ny = 0; }
    world.player.input.move.x = nx;
    world.player.input.move.z = ny; // screen-y → world-z (camera 3/4 mapping)
  }

  function onEnd(e) {
    let found = false;
    for (const t of e.changedTouches) {
      if (t.identifier === activeId) { found = true; break; }
    }
    if (!found) return;
    activeId = null;
    stick.style.transform = `translate(-50%, -50%)`;
    world.player.input.move.x = 0;
    world.player.input.move.z = 0;
  }

  base.addEventListener('touchstart', onStart, { passive: false });
  base.addEventListener('touchmove', onMove, { passive: false });
  base.addEventListener('touchend', onEnd);
  base.addEventListener('touchcancel', onEnd);

  // Keyboard fallback for desktop dev
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key] = true; updateKeys(); });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; updateKeys(); });
  function updateKeys() {
    let kx = (keys['d'] || keys['ArrowRight'] ? 1 : 0) - (keys['a'] || keys['ArrowLeft'] ? 1 : 0);
    let ky = (keys['s'] || keys['ArrowDown'] ? 1 : 0) - (keys['w'] || keys['ArrowUp'] ? 1 : 0);
    world.player.input.move.x = kx;
    world.player.input.move.z = ky;
  }
}
