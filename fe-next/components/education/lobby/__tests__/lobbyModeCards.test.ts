import { describe, it, expect } from 'vitest';
import { FEATURED_MODE_COUNT, modeCardArt, modeCardFacts, visibleModeIds } from '../lobbyModeCards';

const ALL = ['classic', 'blast', 'word-hunt', 'wheel-rush', 'vocab-quiz'] as const;

describe('visibleModeIds — the launch screen shows big cards, most-played first', () => {
  it('Given the fold is closed, Then it shows the three most-played modes, quiz first', () => {
    expect(visibleModeIds(ALL, 'vocab-quiz', false)).toEqual(['vocab-quiz', 'classic', 'blast']);
    expect(FEATURED_MODE_COUNT).toBe(3);
  });

  it('Given the fold is open, Then every mode is a card, featured ones still first', () => {
    expect(visibleModeIds(ALL, 'vocab-quiz', true)).toEqual([
      'vocab-quiz',
      'classic',
      'blast',
      'word-hunt',
      'wheel-rush',
    ]);
  });

  it('Given a non-featured mode is selected and the fold closes, Then it stays on screen (the card GO LIVE names is never hidden)', () => {
    const shown = visibleModeIds(ALL, 'wheel-rush', false);
    expect(shown).toHaveLength(3);
    expect(shown).toContain('wheel-rush');
    expect(shown[0]).toBe('vocab-quiz');
  });

  it('Given a catalog without the quiz, Then it still fills the row from the catalog order', () => {
    expect(visibleModeIds(['classic', 'blast', 'word-hunt'], 'classic', false)).toEqual([
      'classic',
      'blast',
      'word-hunt',
    ]);
  });

  it('Given a new catalog mode nobody ranked, Then it appears in the fold rather than vanishing', () => {
    expect(visibleModeIds([...ALL, 'wordcraft'], 'classic', true)).toContain('wordcraft');
  });
});

describe('modeCardArt — storybook node art per mode', () => {
  it('uses the quiz node for the vocab quiz', () => {
    expect(modeCardArt('vocab-quiz')).toBe('/images/education/node-quiz.webp');
  });

  it('uses the arena node for every board mode', () => {
    for (const id of ['classic', 'blast', 'word-hunt', 'wheel-rush']) {
      expect(modeCardArt(id)).toBe('/images/education/node-arena.webp');
    }
  });

  it('uses the wordcraft node only for a wordcraft classroom mode', () => {
    expect(modeCardArt('wordcraft')).toBe('/images/education/node-wordcraft.webp');
    expect(modeCardArt('word-craft')).toBe('/images/education/node-wordcraft.webp');
  });
});

describe('modeCardFacts — a teacher picks in two seconds', () => {
  const lobby = { vocabQuizQuestionCount: 10, vocabQuizSeconds: 20, boardSize: 'medium' as const, minWordLength: 3 };

  it('Given the quiz, Then it states the configured question count and per-question pace', () => {
    expect(modeCardFacts('vocab-quiz', lobby)).toEqual([
      { kind: 'questions', count: 10 },
      { kind: 'pace', seconds: 20 },
    ]);
  });

  it('Given a board mode, Then it states the configured board and the minimum word length (difficulty)', () => {
    expect(modeCardFacts('classic', lobby)).toEqual([
      { kind: 'board', label: '6×6' },
      { kind: 'letters', min: 3 },
    ]);
    expect(modeCardFacts('blast', { ...lobby, boardSize: 'large', minWordLength: 4 })).toEqual([
      { kind: 'board', label: '7×7' },
      { kind: 'letters', min: 4 },
    ]);
  });

  it('Given nothing configured, Then it invents nothing', () => {
    expect(modeCardFacts('vocab-quiz', {})).toEqual([]);
    expect(modeCardFacts('classic', {})).toEqual([]);
  });
});
