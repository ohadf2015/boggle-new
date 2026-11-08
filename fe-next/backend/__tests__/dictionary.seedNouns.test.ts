import { describe, it, expect } from 'vitest';
import { dictionary } from '../dictionary';

describe('board seed words', () => {
  it('only seeds nouns that players can actually score', () => {
    const d = dictionary as unknown as { swedishWords: Set<string>; nounLists: Map<string, Set<string>> };
    const savedWords = d.swedishWords;
    const savedNouns = d.nounLists.get('sv');
    try {
      d.swedishWords = new Set(['katt', 'hund']);
      d.nounLists.set('sv', new Set(['katt', 'abborrgrund', 'hund']));
      const seeds = dictionary.getRandomLongWords('sv', 10, 3, 12);
      expect(seeds.sort()).toEqual(['HUND', 'KATT']);
    } finally {
      d.swedishWords = savedWords;
      if (savedNouns) d.nounLists.set('sv', savedNouns); else d.nounLists.delete('sv');
    }
  });
});
