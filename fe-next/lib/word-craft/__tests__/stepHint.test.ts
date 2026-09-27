import { describe, expect, it } from 'vitest';
import { resolveWordCraftStep } from '../stepHint';

describe('resolveWordCraftStep', () => {
  const base = { turn: 'player' as const, selectedTileId: null as string | null, pendingCount: 0, canInteract: true };

  it('asks the player to PICK a letter when nothing is selected or pending', () => {
    expect(resolveWordCraftStep(base)).toBe('pick');
  });

  it('asks the player to PLACE once a rack tile is selected but not yet placed', () => {
    expect(resolveWordCraftStep({ ...base, selectedTileId: 't1' })).toBe('place');
  });

  it('asks the player to SUBMIT once at least one tile is on the board', () => {
    expect(resolveWordCraftStep({ ...base, pendingCount: 1 })).toBe('submit');
    // pending takes priority even if a tile is still selected
    expect(resolveWordCraftStep({ ...base, selectedTileId: 't1', pendingCount: 2 })).toBe('submit');
  });

  it('shows the BOT step while the opponent is thinking', () => {
    expect(resolveWordCraftStep({ ...base, turn: 'bot' })).toBe('bot');
  });

  it('shows the OVER step when the game has ended', () => {
    expect(resolveWordCraftStep({ ...base, turn: 'over', pendingCount: 3 })).toBe('over');
  });

  it('falls back to idle (no nagging) when the player cannot interact yet', () => {
    expect(resolveWordCraftStep({ ...base, canInteract: false })).toBe('idle');
  });
});
