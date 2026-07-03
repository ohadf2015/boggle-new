import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, loadSetupPrefs, saveSetupPrefs } from '../setupPrefs';

beforeEach(() => localStorage.clear());

describe('setupPrefs', () => {
  it('round-trips a choice', () => {
    saveSetupPrefs({ opponent: 'hotseat', difficulty: 'hard', modifier: 'land_grab' });
    expect(loadSetupPrefs()).toEqual({ opponent: 'hotseat', difficulty: 'hard', modifier: 'land_grab' });
  });

  it('returns defaults on missing or corrupt storage', () => {
    expect(loadSetupPrefs()).toEqual(DEFAULT_SETUP);
    localStorage.setItem('wordcraft.setup.v1', '{nope');
    expect(loadSetupPrefs()).toEqual(DEFAULT_SETUP);
  });

  it('sanitizes unknown enum values back to defaults', () => {
    localStorage.setItem(
      'wordcraft.setup.v1',
      JSON.stringify({ opponent: 'alien', difficulty: 'insane', modifier: 'nope' }),
    );
    expect(loadSetupPrefs()).toEqual(DEFAULT_SETUP);
  });
});
