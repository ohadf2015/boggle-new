import { describe, it, expect } from 'vitest';
import { FEATURED_MODE_COUNT, modeCardArt, visibleModeIds } from '../lobbyModeCards';

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
