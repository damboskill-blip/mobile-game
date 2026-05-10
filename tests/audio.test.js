import { describe, it, expect, beforeEach } from 'vitest';

describe('audio toggle', () => {
  beforeEach(() => {
    if (globalThis.localStorage) globalThis.localStorage.clear();
  });

  it('starts enabled by default', async () => {
    // Re-import fresh module to get initial state
    const mod = await import('../src/audio.js?t=' + Date.now());
    expect(mod.isAudioEnabled()).toBe(true);
  });

  it('persists disabled state to localStorage', async () => {
    if (!globalThis.localStorage) return; // skip in node-only env
    const mod = await import('../src/audio.js?t=' + Date.now() + 'b');
    mod.setAudioEnabled(false);
    expect(localStorage.getItem('bmt:audio')).toBe('0');
  });

  it('loadAudioPref restores disabled state', async () => {
    if (!globalThis.localStorage) return;
    localStorage.setItem('bmt:audio', '0');
    const mod = await import('../src/audio.js?t=' + Date.now() + 'c');
    mod.setAudioEnabled(true); // reset to enabled first
    mod.loadAudioPref();
    expect(mod.isAudioEnabled()).toBe(false);
  });
});
