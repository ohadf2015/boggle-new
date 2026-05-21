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

  it('passes the current player\'s true rank to ConsolationRows via startRank', () => {
    const block = source.slice(source.indexOf('<ConsolationRows'));
    const close = block.indexOf('/>');
    const props = block.slice(0, close);
    expect(props).toMatch(/startRank=\{currentPlayerRank\}/);
  });

  it('renders ConsolationRows with only the current player\'s row', () => {
    const block = source.slice(source.indexOf('<ConsolationRows'));
    const close = block.indexOf('/>');
    const props = block.slice(0, close);
    // players list is filtered to the current username
    expect(props).toMatch(/players=\{[^}]*username[^}]*\}/);
  });
});
