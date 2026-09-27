import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * ResultsMainContent — declutter contract.
 *
 * The MP results body was cluttered with overlapping motivational cards. We
 * keep only the single most significant encouraging line (the personalized
 * Revenge/Defend card) and trim per-player clutter to the current player.
 *
 *  - The redundant generic ResultsLoserFeedback card is removed.
 *  - ConsolationRows shows only the current player's row, at their true rank
 *    (startRank = currentPlayerRank).
 *  - The richer Revenge/Defend card is retained.
 */
const source = readFileSync(
  resolve(__dirname, '../ResultsMainContent.tsx'),
  'utf8',
);

describe('ResultsMainContent declutter', () => {
  it('no longer renders the redundant ResultsLoserFeedback card', () => {
    expect(source).not.toMatch(/<ResultsLoserFeedback/);
  });

  it('keeps the personalized Revenge/Defend card as the significant encouraging line', () => {
    expect(source).toMatch(/<ResultsRevengeSection/);
  });

  // CHANGED 2026-08-26: the trim is now size-aware, so this can no longer be a
  // literal source match. Rooms bigger than four list the whole remaining field
  // from rank 4; four or fewer keep the single row at `currentPlayerRank`. The
  // real behaviour of both branches is asserted in
  // ResultsMainContent.bigRoomField.test.tsx — a source grep cannot see a render.
  it('still numbers ConsolationRows by real rank, never by list index', () => {
    const block = source.slice(source.indexOf('<ConsolationRows'));
    const props = block.slice(0, block.indexOf('/>'));
    expect(props).toMatch(/startRank=\{/);
    expect(props).toMatch(/currentPlayerRank/);
  });

  it('renders ConsolationRows with only the current player\'s row', () => {
    const block = source.slice(source.indexOf('<ConsolationRows'));
    const close = block.indexOf('/>');
    const props = block.slice(0, close);
    // players list is filtered to the current username
    expect(props).toMatch(/players=\{[^}]*username[^}]*\}/);
  });
});
