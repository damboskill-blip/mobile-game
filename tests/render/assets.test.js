import { describe, it, expect } from 'vitest';
import { isFoxLoaded } from '../../src/assets.js';

describe('assets', () => {
  it('initially has no fox loaded', () => {
    // We don't await loadAssets here — testing the default state
    expect(isFoxLoaded()).toBe(false);
  });
});
