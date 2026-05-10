let ctx = null;
let masterGain = null;
let enabled = true;

const STORAGE_KEY = 'bmt:audio';

function ensureContext() {
  if (ctx) return ctx;
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function loadAudioPref() {
  if (typeof localStorage === 'undefined') return;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === '0') enabled = false;
}

export function isAudioEnabled() {
  return enabled;
}

export function setAudioEnabled(on) {
  enabled = on;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  }
  if (on) ensureContext(); // user gesture often required
}

function play({ freq, type = 'sine', duration = 0.15, attack = 0.005, decay = 0.1, volume = 0.5, sweep = 0 }) {
  if (!enabled) return;
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  if (sweep) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + sweep), c.currentTime + duration);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(volume, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay);
  osc.connect(g);
  g.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + attack + decay + 0.05);
}

function playNoise({ duration = 0.1, volume = 0.3, filterFreq = 800, filterQ = 5 }) {
  if (!enabled) return;
  const c = ensureContext();
  if (!c) return;
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const g = c.createGain();
  g.gain.value = volume;
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start();
}

// Public sound effects
export function sfxChop()    { playNoise({ duration: 0.08, volume: 0.4, filterFreq: 400, filterQ: 8 }); }
export function sfxKill()    { play({ freq: 80, type: 'sawtooth', duration: 0.3, decay: 0.25, volume: 0.5, sweep: -40 }); }
export function sfxPickup()  { play({ freq: 600, type: 'square', duration: 0.08, decay: 0.06, volume: 0.25, sweep: 200 }); }
export function sfxMoney()   { play({ freq: 880, type: 'triangle', duration: 0.12, decay: 0.10, volume: 0.4, sweep: 400 }); }
export function sfxSale()    { play({ freq: 440, type: 'square', duration: 0.10, decay: 0.08, volume: 0.3, sweep: 220 }); }
export function sfxDeposit() { play({ freq: 220, type: 'sine', duration: 0.15, decay: 0.12, volume: 0.4, sweep: 110 }); }
export function sfxHire()    { play({ freq: 330, type: 'sine', duration: 0.30, decay: 0.25, volume: 0.5, sweep: 660 }); }
export function sfxFenceHit(){ play({ freq: 150, type: 'sawtooth', duration: 0.12, decay: 0.10, volume: 0.4, sweep: -60 }); }
