import { applyCardEffects } from '../cardEffects';
import { POWER_CARD_POOL, type ScoreContext } from '../powerCards';
import type { ScoringTile } from '../../types';

const tile = (letter: string, value: number, premium: ScoringTile['premium'] = null): ScoringTile => ({
  letter, value, premium,
});
const card = (id: string) => POWER_CARD_POOL.find((c) => c.id === id)!;
const ctx = (over: Partial<ScoreContext> = {}): ScoreContext => ({
  wordTiles: [tile('C', 3), tile('A', 1), tile('T', 1)],
  wordLength: 3,
  wordIndexInRound: 0,
  baseChips: 5,
  baseMult: 1,
  ...over,
});

describe('applyCardEffects', () => {
  it('returns base chips x baseMult when no cards active', () => {
    expect(applyCardEffects(ctx(), [])).toEqual({ chips: 5, mult: 1, total: 5 });
  });

  it('adds card chip bonuses before multiplying', () => {
    // steadyBuild +5 chips => (5+5) * 1 = 10
    expect(applyCardEffects(ctx(), [card('steadyBuild')])).toEqual({ chips: 10, mult: 1, total: 10 });
  });

  it('adds addMult into the multiplier sum', () => {
    // combo at wordIndex 2 => addMult 2 => mult (1+2) = 3 => 5*3 = 15
    expect(applyCardEffects(ctx({ wordIndexInRound: 2 }), [card('combo')])).toEqual({
      chips: 5, mult: 3, total: 15,
    });
  });

  it('applies mulMult after the addMult sum', () => {
    // longGame on a 5-letter word: mulMult 2 => mult (1+0)*2 = 2 => 5*2 = 10
    expect(applyCardEffects(ctx({ wordLength: 5 }), [card('longGame')])).toEqual({
      chips: 5, mult: 2, total: 10,
    });
  });

  it('stacks multiple cards: chips add, addMult sums, mulMult multiplies', () => {
    // steadyBuild (+5 chips), combo@idx1 (+1 addMult), longGame@len5 (x2 mulMult)
    // chips = 5+5 = 10; mult = (1 + 1) * 2 = 4; total = 40
    const result = applyCardEffects(
      ctx({ wordIndexInRound: 1, wordLength: 5 }),
      [card('steadyBuild'), card('combo'), card('longGame')],
    );
    expect(result).toEqual({ chips: 10, mult: 4, total: 40 });
  });

  it('ignores cards without a scoreEffect', () => {
    expect(applyCardEffects(ctx(), [card('wildcardStash'), card('letterHoard')])).toEqual({
      chips: 5, mult: 1, total: 5,
    });
  });
});
