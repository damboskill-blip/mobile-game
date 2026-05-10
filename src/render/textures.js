import * as THREE from 'three';

function createCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// Simple value-noise grid blurred
function valueNoise(ctx, size, scale, baseColor, accentColor) {
  const cells = Math.ceil(size / scale);
  const grid = [];
  for (let y = 0; y <= cells; y++) {
    grid[y] = [];
    for (let x = 0; x <= cells; x++) grid[y][x] = Math.random();
  }
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = x / scale, gy = y / scale;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy;
      const a = grid[iy][ix], b = grid[iy][ix + 1];
      const c = grid[iy + 1][ix], d = grid[iy + 1][ix + 1];
      const top = a * (1 - fx) + b * fx;
      const bot = c * (1 - fx) + d * fx;
      const v = top * (1 - fy) + bot * fy;
      const r = baseColor[0] * (1 - v) + accentColor[0] * v;
      const g = baseColor[1] * (1 - v) + accentColor[1] * v;
      const bl = baseColor[2] * (1 - v) + accentColor[2] * v;
      const idx = (y * size + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = bl;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

let _grassTex, _woodTex, _stoneTex;

export function getGrassTexture() {
  if (_grassTex) return _grassTex;
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  valueNoise(ctx, 256, 8, [56, 110, 36], [98, 156, 60]);
  // Add a few darker speckles for variation
  ctx.fillStyle = 'rgba(34,72,28,0.5)';
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  _grassTex = new THREE.CanvasTexture(c);
  _grassTex.wrapS = _grassTex.wrapT = THREE.RepeatWrapping;
  _grassTex.repeat.set(8, 8);
  _grassTex.colorSpace = THREE.SRGBColorSpace;
  return _grassTex;
}

export function getWoodTexture() {
  if (_woodTex) return _woodTex;
  const c = createCanvas(128);
  const ctx = c.getContext('2d');
  // Vertical grain: stripes of wood tones
  for (let x = 0; x < 128; x++) {
    const v = 0.5 + 0.5 * Math.sin(x * 0.4 + Math.random() * 0.5);
    const r = 92 + v * 45;
    const g = 58 + v * 28;
    const b = 30 + v * 14;
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.fillRect(x, 0, 1, 128);
  }
  // Knots
  for (let i = 0; i < 4; i++) {
    const cx = Math.random() * 128, cy = Math.random() * 128;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
    grad.addColorStop(0, 'rgba(50,30,15,0.7)');
    grad.addColorStop(1, 'rgba(50,30,15,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 8, cy - 8, 16, 16);
  }
  _woodTex = new THREE.CanvasTexture(c);
  _woodTex.wrapS = _woodTex.wrapT = THREE.RepeatWrapping;
  _woodTex.colorSpace = THREE.SRGBColorSpace;
  return _woodTex;
}

export function getStoneTexture() {
  if (_stoneTex) return _stoneTex;
  const c = createCanvas(128);
  const ctx = c.getContext('2d');
  valueNoise(ctx, 128, 6, [100, 100, 105], [150, 148, 145]);
  _stoneTex = new THREE.CanvasTexture(c);
  _stoneTex.wrapS = _stoneTex.wrapT = THREE.RepeatWrapping;
  _stoneTex.colorSpace = THREE.SRGBColorSpace;
  return _stoneTex;
}
