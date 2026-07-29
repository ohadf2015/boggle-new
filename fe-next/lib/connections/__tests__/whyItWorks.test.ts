import { describe, it, expect } from 'vitest';
import { whyItWorks } from '../whyItWorks';
import type { ConnectionPuzzle } from '../types';

const base: ConnectionPuzzle = {
  id: 'en-e-001',
  word1: 'BOOK',
  bridge: 'WORM',
  word2: 'HOLE',
  difficulty: 'easy',
};

describe('whyItWorks — the post-solve "aha" teach moment', () => {
  it('derives both compounds for a closed-compound language (no stored examples)', () => {
    // BOOK+WORM = bookworm, WORM+HOLE = wormhole
    expect(whyItWorks(base)).toEqual({ left: 'BOOKWORM', right: 'WORMHOLE' });
  });

  it('prefers stored examples when present (Spanish open compounds differ from concat)', () => {
    const es: ConnectionPuzzle = {
      ...base,
      id: 'es-e-003',
      word1: 'video',
      bridge: 'juego',
      word2: 'mesa',
      examples: [{ w1: 'Videojuego', bridge: 'juego', w2: 'juego de mesa' }],
    };
    expect(whyItWorks(es)).toEqual({ left: 'Videojuego', right: 'juego de mesa' });
  });

  it('falls back to concat when examples array is empty', () => {
    const sv: ConnectionPuzzle = { ...base, word1: 'fot', bridge: 'boll', word2: 'plan', examples: [] };
    expect(whyItWorks(sv)).toEqual({ left: 'fotboll', right: 'bollplan' });
  });
});
