import { describe, it, expect } from 'vitest';
import { isAssetLoaded } from '../../src/assets.js';

const EXPECTED_KEYS = [
  'bear', 'player', 'customerA', 'customerB', 'cook', 'cashier',
  'worker', 'tanner', 'premiumCustomer', 'fire', 'register',
  'leatherCounter', 'tannery', 'fence', 'tower',
];

describe('assets', () => {
  it('initially has no assets loaded (loadAssets not called)', () => {
    // We don't await loadAssets here — testing the default state
    for (const key of EXPECTED_KEYS) {
      expect(isAssetLoaded(key)).toBe(false);
    }
  });
});
