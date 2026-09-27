import { describe, it, expect } from 'vitest';
import { resolveCommitTier, clampTierForCosy, type CommitContext } from '../commitTier';

const ctx = (overrides: Partial<CommitContext> = {}): CommitContext => ({
  scoreThisTurn: 10,
  tilesPlaced: 3,
  bingo: false,
  streak: 0,
  hasRareTile: false,
  premiumTriggered: false,
  heatLevel: 0,
  ...overrides,
});

describe('resolveCommitTier', () => {
  it('returns soft for low score with no premium and no rare tile', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 6 }))).toBe('soft');
    expect(resolveCommitTier(ctx({ scoreThisTurn: 11 }))).toBe('soft');
  });

  it('returns nice when score is 12-24', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 12 }))).toBe('nice');
    expect(resolveCommitTier(ctx({ scoreThisTurn: 24 }))).toBe('nice');
  });

  it('promotes soft to nice when a premium cell triggers', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 8, premiumTriggered: true }))).toBe('nice');
  });

  it('returns great when score is 25-49', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 25 }))).toBe('great');
    expect(resolveCommitTier(ctx({ scoreThisTurn: 49 }))).toBe('great');
  });

  it('promotes to great when a rare tile is placed at score >= 15', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 18, hasRareTile: true }))).toBe('great');
  });

  it('returns huge when score is 50-99', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 50 }))).toBe('huge');
    expect(resolveCommitTier(ctx({ scoreThisTurn: 99 }))).toBe('huge');
  });

  it('promotes to huge on a hot streak (3+) with score >= 30', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 35, streak: 3 }))).toBe('huge');
  });

  it('returns bingo when score reaches 100', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 120 }))).toBe('bingo');
  });

  it('returns bingo when seven tiles are placed regardless of score', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 40, tilesPlaced: 7, bingo: true }))).toBe('bingo');
  });

  it('returns soft when no signal at all', () => {
    expect(resolveCommitTier(ctx({ scoreThisTurn: 0, tilesPlaced: 0 }))).toBe('soft');
  });
});

describe('clampTierForCosy', () => {
  it('keeps soft/nice/great unchanged', () => {
    expect(clampTierForCosy('soft')).toBe('soft');
    expect(clampTierForCosy('nice')).toBe('nice');
    expect(clampTierForCosy('great')).toBe('great');
  });

  it('clamps huge and bingo down to great', () => {
    expect(clampTierForCosy('huge')).toBe('great');
    expect(clampTierForCosy('bingo')).toBe('great');
  });
});
