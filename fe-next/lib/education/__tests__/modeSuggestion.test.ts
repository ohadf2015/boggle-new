import { describe, expect, it } from 'vitest';
import { suggestNextMode, type SuggestionRound } from '../modeSuggestion';

const ALL = ['vocab-quiz', 'boss-battle', 'wordcraft', 'classic', 'blast', 'word-hunt', 'wheel-rush'] as const;
const BOT_CAPABLE = new Set(['boss-battle', 'classic', 'blast', 'word-hunt', 'wheel-rush']);

const real = (gameMode: string): SuggestionRound => ({ gameMode, playerCount: 12 });
const solo = (gameMode: string): SuggestionRound => ({ gameMode, playerCount: 1 });

const base = {
  candidates: ALL,
  selected: 'classic' as const,
  hasPro: false,
  rehearseIntent: false,
  isBlocked: () => false,
  isProOnly: () => false,
  botCapable: (id: string) => BOT_CAPABLE.has(id),
};

describe('suggestNextMode', () => {
  it('Given no rounds yet, when asked, then it suggests nothing', () => {
    expect(suggestNextMode({ ...base, rounds: [] })).toBeNull();
  });

  it('Given only classic and quiz lately, when asked, then it suggests a mode outside the last three rounds', () => {
    const pick = suggestNextMode({ ...base, rounds: [real('classic'), real('vocab-quiz'), real('classic'), real('blast')] });
    expect(pick).not.toBeNull();
    expect(['classic', 'vocab-quiz', 'boss-battle']).not.toContain(pick);
  });

  it('Given a boss battle round (stored as classic), when asked, then boss battle counts as played too', () => {
    const pick = suggestNextMode({
      ...base,
      selected: 'blast',
      candidates: ['boss-battle', 'classic', 'wheel-rush'],
      rounds: [real('classic'), real('wheel-rush'), real('vocab-quiz')],
    });
    expect(pick).toBeNull();
  });

  it('Given modes played earlier in the last ten, when asked, then the one played least is suggested first', () => {
    const rounds = [real('classic'), real('classic'), real('classic'), real('blast'), real('blast'), real('word-hunt'), real('wheel-rush'), real('wheel-rush')];
    expect(suggestNextMode({ ...base, candidates: ['blast', 'word-hunt', 'wheel-rush'], rounds })).toBe('word-hunt');
  });

  it('Given more than ten rounds, when asked, then only the latest ten are weighed', () => {
    const rounds = [real('classic'), real('classic'), real('classic'), ...Array(7).fill(real('word-hunt')), ...Array(5).fill(real('blast'))];
    expect(suggestNextMode({ ...base, candidates: ['blast', 'word-hunt'], rounds })).toBe('blast');
  });

  it('Given a mode the lobby cannot start, when asked, then it is never suggested', () => {
    const pick = suggestNextMode({
      ...base,
      candidates: ['vocab-quiz', 'blast'],
      isBlocked: (id) => id === 'blast',
      rounds: [real('classic'), real('classic'), real('classic')],
    });
    expect(pick).toBe('vocab-quiz');
  });

  it('Given a Pro-only mode and a free teacher, when asked, then it is skipped; a Pro teacher may get it', () => {
    const args = { ...base, candidates: ['word-hunt', 'blast'] as const, isProOnly: (id: string) => id === 'word-hunt', rounds: [real('classic')] };
    expect(suggestNextMode(args)).toBe('blast');
    expect(suggestNextMode({ ...args, hasPro: true })).toBe('word-hunt');
  });

  it('Given the mode already selected in the lobby, when asked, then it is not suggested again', () => {
    expect(suggestNextMode({ ...base, selected: 'blast', candidates: ['blast'], rounds: [real('classic')] })).toBeNull();
  });

  it('Given a teacher who has only rehearsed alone, when asked, then a bots-capable mode wins over a human-only one', () => {
    const args = { ...base, candidates: ['wordcraft', 'vocab-quiz', 'blast'] as const, rounds: [solo('classic')] };
    expect(suggestNextMode(args)).toBe('blast');
  });

  it('Given a rehearse intent even after real rounds, when asked, then bots-capable modes are preferred', () => {
    const args = { ...base, candidates: ['wordcraft', 'wheel-rush'] as const, rounds: [real('classic')] };
    expect(suggestNextMode(args)).toBe('wordcraft');
    expect(suggestNextMode({ ...args, rehearseIntent: true })).toBe('wheel-rush');
  });

  it('Given rehearsing and only human-only modes left, when asked, then it still suggests one', () => {
    expect(suggestNextMode({ ...base, candidates: ['wordcraft'], rounds: [solo('classic')] })).toBe('wordcraft');
  });
});
