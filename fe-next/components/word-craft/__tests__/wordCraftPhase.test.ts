import { describe, expect, it } from 'vitest';
import { resolveInitialWordCraftPhase } from '@/app/[locale]/word-craft/PageClient';
import { DEFAULT_SETUP } from '@/lib/word-craft/setupPrefs';

const prefs = { ...DEFAULT_SETUP, difficulty: 'hard' as const, modifier: 'land_grab' as const };

describe('resolveInitialWordCraftPhase', () => {
  it('plain visit → setup screen', () => {
    expect(resolveInitialWordCraftPhase(new URLSearchParams(''), false, prefs)).toEqual({ name: 'setup' });
  });

  it('duel link skips setup and forces a bot opponent', () => {
    expect(resolveInitialWordCraftPhase(new URLSearchParams(''), true, prefs)).toEqual({
      name: 'playing',
      choice: { ...prefs, opponent: 'bot' },
    });
  });

  it('?vs=human deep link skips setup into hotseat', () => {
    expect(resolveInitialWordCraftPhase(new URLSearchParams('vs=human'), false, prefs)).toEqual({
      name: 'playing',
      choice: { ...prefs, opponent: 'hotseat' },
    });
  });

  it('?quick=1 skips setup with the persisted prefs', () => {
    expect(resolveInitialWordCraftPhase(new URLSearchParams('quick=1'), false, prefs)).toEqual({
      name: 'playing',
      choice: prefs,
    });
  });
});
