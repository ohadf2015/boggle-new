import { describe, expect, it } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';
import { modifierRackSize } from '../modifiers';

describe('quick_draw modifier', () => {
  it('modifierRackSize maps quick_draw→5, everything else→7', () => {
    expect(modifierRackSize('quick_draw')).toBe(5);
    expect(modifierRackSize('none')).toBe(7);
    expect(modifierRackSize('land_grab')).toBe(7);
  });

  it('deals 5-tile racks to both seats', () => {
    const s = buildInitialState({ seed: 3, locale: 'en', modifierOverride: 'quick_draw' });
    expect(s.rackSize).toBe(5);
    expect(s.player.rack).toHaveLength(5);
    expect(s.bot.rack).toHaveLength(5);
  });

  it('refills only up to 5 after a commit', () => {
    const s0 = buildInitialState({ seed: 3, locale: 'en', modifierOverride: 'quick_draw' });
    const [a, b] = s0.player.rack;
    const center = Math.floor(s0.board.size / 2);
    const placements = [
      { row: center, col: center, letter: a.letter, value: a.value, isBlank: a.isBlank, rackTileId: a.id },
      { row: center, col: center + 1, letter: b.letter, value: b.value, isBlank: b.isBlank, rackTileId: b.id },
    ];
    const s1 = wordCraftReducer(s0, { type: 'COMMIT_PLAYER', placements, score: 4, words: ['XX'] });
    expect(s1.player.rack).toHaveLength(5);
  });

  it('default game still deals 7', () => {
    const s = buildInitialState({ seed: 3, locale: 'en', modifierOverride: 'none' });
    expect(s.rackSize).toBe(7);
    expect(s.player.rack).toHaveLength(7);
  });
});
