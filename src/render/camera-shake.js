let shakeAmplitude = 0;
let shakeTimer = 0;

export function triggerShake(amplitude = 0.08, duration = 0.2) {
  shakeAmplitude = Math.max(shakeAmplitude, amplitude);
  shakeTimer = Math.max(shakeTimer, duration);
}

export function applyShake(camera, dt, baseTarget) {
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    const t = Math.max(0, shakeTimer / 0.2);
    const offX = (Math.random() - 0.5) * shakeAmplitude * t;
    const offY = (Math.random() - 0.5) * shakeAmplitude * t;
    camera.position.x += offX;
    camera.position.y += offY;
  } else {
    shakeAmplitude = 0;
  }
}
