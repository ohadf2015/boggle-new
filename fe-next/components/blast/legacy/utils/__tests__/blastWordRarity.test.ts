import { describe, it, expect } from 'vitest';
import { scoreWordRarity, getWordRarityTier, diamondsForWord } from '../blastWordRarity';

describe('blastWordRarity', () => {
  it('rates short plain words as common', () => {
    expect(getWordRarityTier('cat')).toBe('common');
    expect(getWordRarityTier('house')).toBe('common');
  });

  it('rates six-letter plain words as uncommon', () => {
    expect(getWordRarityTier('planet')).toBe('uncommon');
  });

  it('rates words with rare letters or long length as rare', () => {
    expect(getWordRarityTier('jumpy')).toBe('rare');
    expect(getWordRarityTier('strength')).toBe('rare');
  });

  it('rates words stacked with rare letters as epic', () => {
    expect(getWordRarityTier('quartz')).toBe('epic');
    expect(getWordRarityTier('jazz')).toBe('epic');
  });

  it('is case-insensitive', () => {
    expect(scoreWordRarity('QUARTZ')).toBe(scoreWordRarity('quartz'));
  });

  it('scores Hebrew letters from the Hebrew tile values', () => {
    expect(scoreWordRarity('צפרדע')).toBeGreaterThan(scoreWordRarity('אבא'));
  });

  it('falls back to length alone for scripts without letter values', () => {
    expect(getWordRarityTier('кот')).toBe('common');
    expect(getWordRarityTier('столица')).toBe('rare');
    expect(getWordRarityTier('достопримечательность')).toBe('epic');
  });

  it('returns common for an empty word', () => {
    expect(getWordRarityTier('')).toBe('common');
  });

  it('awards no diamonds for common/uncommon, one for rare, two for epic', () => {
    expect(diamondsForWord('cat')).toBe(0);
    expect(diamondsForWord('planet')).toBe(0);
    expect(diamondsForWord('jumpy')).toBe(1);
    expect(diamondsForWord('quartz')).toBe(2);
  });
});
