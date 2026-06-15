import { describe, it, expect } from 'vitest';
import {
  pickSighting,
  SIGHTING_MIN_ALT_M,
  SIGHTING_WHALE_MIN_ALT_M,
  SIGHTING_CHANCE,
  SIGHTING_ASSET,
} from './skySightings';

describe('pickSighting', () => {
  it('shows nothing below the minimum altitude, however lucky the roll', () => {
    expect(pickSighting(0, SIGHTING_MIN_ALT_M - 1)).toBeNull();
    expect(pickSighting(0, 0)).toBeNull();
  });

  it('shows nothing when the roll misses the chance gate', () => {
    expect(pickSighting(SIGHTING_CHANCE, 500)).toBeNull();
    expect(pickSighting(0.99, 500)).toBeNull();
  });

  it('returns a valid kind inside the chance window at altitude', () => {
    const kind = pickSighting(0.01, 500);
    expect(['whale', 'satellite', 'shootingStar']).toContain(kind);
  });

  it('reserves the whale for the deep biomes', () => {
    // a low-sub roll just above the min altitude must NOT be a whale
    expect(pickSighting(0.001, SIGHTING_WHALE_MIN_ALT_M - 1)).not.toBe('whale');
    // the same favourable roll high up CAN be the whale
    expect(pickSighting(0.001, SIGHTING_WHALE_MIN_ALT_M + 50)).toBe('whale');
  });

  it('is deterministic for identical inputs', () => {
    expect(pickSighting(0.05, 600)).toBe(pickSighting(0.05, 600));
  });

  it('ships a whale asset path', () => {
    expect(SIGHTING_ASSET.whale).toBe('/images/word-tower/wt-spacewhale.png');
  });
});
