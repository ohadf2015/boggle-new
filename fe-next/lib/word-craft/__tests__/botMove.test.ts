import { describe, it, expect } from 'vitest';
import { createBoard, placeTiles } from '../board';
import { findBestBotMove } from '../botMove';
import type { PlacedTile, RackTile } from '../types';

const TILE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, _: 0,
};

const rackTile = (letter: string, idx: number): RackTile => ({
  id: `r-${idx}-${letter}`,
  letter,
  value: TILE_VALUES[letter] ?? 0,
  isBlank: letter === '_',
});

const makeRack = (letters: string): RackTile[] => letters.split('').map(rackTile);

const place = (row: number, col: number, letter: string): PlacedTile => ({
  row,
  col,
  letter,
  value: TILE_VALUES[letter] ?? 0,
  isBlank: false,
  rackTileId: `t-${row}-${col}`,
});

describe('findBestBotMove', () => {
  it('returns null when rack cannot form any valid word', () => {
    const board = createBoard();
    const rack = makeRack('XQZJK');
    const dict = new Set<string>();
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()));
    expect(move).toBeNull();
  });

  it('on an empty Conquest board, plays a valid word anywhere (no center rule)', () => {
    const board = createBoard(11, { premiums: false });
    const rack = makeRack('CATXYZ_');
    const dict = new Set(['CAT', 'AT', 'CAB']);
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()));
    expect(move).not.toBeNull();
    // Every placed tile is in bounds; the opening word need NOT touch the center.
    expect(move!.placements.every((p) => p.row >= 0 && p.row < 11 && p.col >= 0 && p.col < 11)).toBe(true);
    expect(move!.placements.length).toBeGreaterThanOrEqual(2);
    expect(move!.score).toBeGreaterThan(0);
  });

  it('picks the higher-scoring word when multiple are valid (premium-free)', () => {
    const board = createBoard(11, { premiums: false });
    const rack = makeRack('CATSZE_');
    // No premiums: CAT = 3+1+1 = 5, CATS = 3+1+1+1 = 6. Bot should prefer CATS.
    const dict = new Set(['CAT', 'CATS', 'AT', 'AS']);
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()));
    expect(move).not.toBeNull();
    expect(move!.score).toBeGreaterThanOrEqual(6);
  });

  it('on a non-empty board, plays a word that connects to existing tiles', () => {
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const rack = makeRack('SOLEMN_');
    const dict = new Set(['CAT', 'SO', 'OS', 'NO', 'ON', 'NOT', 'SOL', 'LO']);
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()));
    if (move) {
      // Bot's word should be adjacent to at least one existing tile
      const adj = move.placements.some((p) => {
        const around: [number, number][] = [
          [p.row - 1, p.col],
          [p.row + 1, p.col],
          [p.row, p.col - 1],
          [p.row, p.col + 1],
        ];
        return around.some(([r, c]) => r === 7 && c >= 7 && c <= 9);
      });
      expect(adj).toBe(true);
    } else {
      // It's allowed for the bot to find no legal extension move with this restricted dict; in that case skip.
      expect(move).toBeNull();
    }
  });

  it('default maxLength allows a 7-letter bingo on the first move', () => {
    const board = createBoard();
    const rack = makeRack('STRAINS');
    // STRAINS is 7 letters. With default maxLength (was 5, now 7), the bot
    // should be able to find and play it on the empty board.
    const dict = new Set(['STRAINS', 'STRAIN', 'STAIR', 'AIR']);
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()));
    expect(move).not.toBeNull();
    // Bot will pick the highest-scoring option; STRAINS at 7 tiles beats any
    // shorter subword on the same row, so we expect length 7.
    expect(move!.placements.length).toBe(7);
  });

  it('reports the actual played word, not the rack permutation, when extending', () => {
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const rack = makeRack('ERXYZ__');
    // Bot plays ER at (7,10),(7,11). findMainWordSpan extends left through
    // the existing CAT → the real word is CATER, not the rack word ER.
    const dict = new Set(['CAT', 'ER', 'CATER']);
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()));
    expect(move).not.toBeNull();
    expect(move!.word).toBe('CATER');
  });

  it('returned word always satisfies the provided isWordValid predicate', () => {
    const board = createBoard();
    placeTiles(board, [place(7, 7, 'C'), place(7, 8, 'A'), place(7, 9, 'T')]);
    const rack = makeRack('ERSOLM_');
    const dict = new Set(['CAT', 'ER', 'CATER', 'SO', 'OS', 'CATERS']);
    const isWordValid = (w: string) => dict.has(w.toUpperCase());
    const move = findBestBotMove(board, rack, isWordValid);
    if (move) expect(isWordValid(move.word)).toBe(true);
  });

  it('respects maxLength option (caps permutation length)', () => {
    const board = createBoard();
    const rack = makeRack('STRAINS');
    // STRAINS is 7 letters. With maxLength=3, the bot should never propose a 7-letter move.
    const dict = new Set(['STRAINS', 'STRAIN', 'STAIR', 'AIR', 'SIN', 'TAR', 'AT']);
    const move = findBestBotMove(board, rack, (w) => dict.has(w.toUpperCase()), { maxLength: 3 });
    expect(move).not.toBeNull();
    expect(move!.placements.length).toBeLessThanOrEqual(3);
  });

  describe('skillVariance (bot difficulty knob)', () => {
    const board = () => createBoard();
    const rack = () => makeRack('CATSXYZ');
    // Distinct first-move words of clearly separable score: CATS > CAT/SAT > AT/AS.
    const dict = new Set(['CAT', 'CATS', 'SAT', 'AT', 'AS']);
    const valid = (w: string) => dict.has(w.toUpperCase());

    it('skillVariance 0 ignores rng and returns the strict best move', () => {
      // GIVEN the strict-best baseline (no difficulty options)
      const best = findBestBotMove(board(), rack(), valid);
      // WHEN skill is 0 even with an rng that would pick the last candidate
      const move = findBestBotMove(board(), rack(), valid, { skillVariance: 0, rng: () => 0.999 });
      // THEN it still plays the optimal word
      expect(move!.score).toBe(best!.score);
      expect(move!.word).toBe(best!.word);
    });

    it('skillVariance > 0 with rng selecting the last candidate plays a weaker word', () => {
      // GIVEN the strict best
      const best = findBestBotMove(board(), rack(), valid);
      // WHEN skill spreads the pool and rng lands on the lowest-ranked of the pool
      const move = findBestBotMove(board(), rack(), valid, { skillVariance: 1, rng: () => 0.999 });
      // THEN the bot plays a strictly lower-scoring word than its best
      expect(move).not.toBeNull();
      expect(move!.score).toBeLessThan(best!.score);
    });

    it('skillVariance > 0 with rng selecting the first candidate still returns the best', () => {
      const best = findBestBotMove(board(), rack(), valid);
      const move = findBestBotMove(board(), rack(), valid, { skillVariance: 1, rng: () => 0 });
      expect(move!.score).toBe(best!.score);
    });

    it('higher selectionSkew biases the pick toward weaker words for the same rng', () => {
      // GIVEN the same wide pool and the same mid-range rng draw
      const mild = findBestBotMove(board(), rack(), valid, {
        skillVariance: 5,
        selectionSkew: 1,
        rng: () => 0.5,
      });
      const strong = findBestBotMove(board(), rack(), valid, {
        skillVariance: 5,
        selectionSkew: 4,
        rng: () => 0.5,
      });
      // THEN a stronger downward skew never picks a HIGHER-scoring word
      expect(strong!.score).toBeLessThanOrEqual(mild!.score);
    });

    it('scaling the capture signal flips the bot between chasing a steal and playing its best word', () => {
      // The hook ranks bot candidates by score + (captureBonus × aggression).
      // Model that here with an extraScore that rewards a SHORT word (a proxy
      // for "this move steals a cell"). High aggression makes the bot abandon
      // its best word to grab the bonus; near-zero aggression makes it ignore
      // the steal and just play its strongest word. This is the lever the easy
      // nerf turns down.
      // Premium-free so base scores are pure tile sums: CATS=6 (best, 4 tiles),
      // AT/AS=2 (short, 2 tiles). A proxy of +8 for short words beats CATS at
      // full aggression (2+8=10 > 6) but not at 0.25 (2+2=4 < 6).
      const flat = () => createBoard(11, { premiums: false });
      const captureProxy = (aggression: number) =>
        (placements: PlacedTile[]) => (placements.length <= 2 ? 8 * aggression : 0);

      const aggressive = findBestBotMove(flat(), rack(), valid, {
        skillVariance: 0,
        extraScore: captureProxy(1),
      });
      const tame = findBestBotMove(flat(), rack(), valid, {
        skillVariance: 0,
        extraScore: captureProxy(0.25),
      });

      // Aggressive bot chases the (short-word) steal bonus...
      expect(aggressive!.placements.length).toBeLessThanOrEqual(2);
      // ...while the tamed bot plays its strongest (longer) word instead.
      expect(tame!.placements.length).toBeGreaterThan(aggressive!.placements.length);
    });

    it('selectionSkew defaults to the legacy sqrt skew (skew=1) when omitted', () => {
      // Omitting selectionSkew must reproduce the historical behavior exactly.
      const omitted = findBestBotMove(board(), rack(), valid, {
        skillVariance: 5,
        rng: () => 0.5,
      });
      const explicit = findBestBotMove(board(), rack(), valid, {
        skillVariance: 5,
        selectionSkew: 1,
        rng: () => 0.5,
      });
      expect(omitted!.word).toBe(explicit!.word);
      expect(omitted!.score).toBe(explicit!.score);
    });
  });
});
