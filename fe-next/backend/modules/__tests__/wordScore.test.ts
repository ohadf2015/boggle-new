/**
 * scoreAcceptedWord — THE per-word score, computed once on the server and used
 * verbatim by the live leaderboard, the stored word detail (results), the
 * `wordAccepted` emit and bots. Blast tile bonuses are fractional multipliers in
 * BLAST_TILE_BONUSES; the per-word total must still be an integer, otherwise the
 * live board (fractional sum) drifts from the results page (rounded per word).
 */
import { describe, it, expect } from 'vitest';
import { scoreAcceptedWord } from '../wordScore';
import { calculateWordScore } from '@/shared/utils/scoring';
import { blastLetterBonus } from '@/lib/blast/blastLetterBonus';
import { calculateBlastTileBonus } from '../blastModeManager';

describe('scoreAcceptedWord', () => {
  it('non-blast word = calculateWordScore, no blast parts', () => {
    const s = scoreAcceptedWord({ word: 'crane', comboLevel: 0 });
    expect(s.wordScore).toBe(calculateWordScore('crane', 0));
    expect(s.blastTileBonus).toBe(0);
    expect(s.blastLetterBonus).toBe(0);
    expect(s.total).toBe(s.wordScore);
  });

  it('fire round doubles the word score and reports the extra as fireRoundBonus', () => {
    const s = scoreAcceptedWord({ word: 'crane', comboLevel: 0, fireRoundActive: true });
    const plain = calculateWordScore('crane', 0);
    expect(s.fireRoundMultiplier).toBe(2);
    expect(s.wordScore).toBe(calculateWordScore('crane', 0, 2));
    expect(s.fireRoundBonus).toBe(plain);
  });

  it('comboBonus is the combo part of the un-multiplied score', () => {
    const s = scoreAcceptedWord({ word: 'crane', comboLevel: 4 });
    expect(s.baseScore).toBe(4);
    expect(s.comboBonus).toBe(calculateWordScore('crane', 4) - 4);
  });

  it('blast: an odd number of gold tiles (x.5 raw bonus) still yields an INTEGER total', () => {
    const tiles = ['gold', 'gold', 'gold'] as const;
    expect(calculateBlastTileBonus([...tiles]) % 1).not.toBe(0); // fixture sanity: raw is 4.5
    const s = scoreAcceptedWord({ word: 'cat', comboLevel: 0, blastTiles: [...tiles] });
    expect(Number.isInteger(s.blastTileBonus)).toBe(true);
    expect(s.blastTileBonus).toBe(Math.round(calculateBlastTileBonus([...tiles])));
    expect(s.blastLetterBonus).toBe(blastLetterBonus('cat'));
    expect(s.total).toBe(s.wordScore + s.blastTileBonus + s.blastLetterBonus);
    expect(Number.isInteger(s.total)).toBe(true);
  });

  it('blast with quarter bonuses (bomb 1.25 x3 = 3.75) rounds once per word', () => {
    const s = scoreAcceptedWord({ word: 'dog', comboLevel: 0, blastTiles: ['bomb', 'bomb', 'bomb'] });
    expect(s.blastTileBonus).toBe(4);
    expect(Number.isInteger(s.total)).toBe(true);
  });

  it('blast with no tiles on the path still pays the letter bonus (mode, not tiles, gates it)', () => {
    const s = scoreAcceptedWord({ word: 'quiz', comboLevel: 0, blastTiles: [] });
    expect(s.blastTileBonus).toBe(0);
    expect(s.blastLetterBonus).toBe(blastLetterBonus('quiz'));
  });
});
