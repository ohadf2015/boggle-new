import { describe, it, expect } from 'vitest';
import { parseWiktionaryResponse as parseEn } from '../wiktionaryEnVerifier';
import { parseWiktionaryResponse as parseSv } from '../wiktionaryVerifier';
import { parseWiktionaryEsResponse as parseEs } from '../wiktionaryEsVerifier';

const entry = (partOfSpeech: string, ...defs: string[]) => ({
  partOfSpeech,
  definitions: defs.map((definition) => ({ definition })),
});

describe('Wiktionary entries that only point at another word', () => {
  it.each([
    ['yuo', entry('Pronoun', ' Deliberate <a href="/wiki/misspelling">misspelling</a> of <i>you</i>.')],
    ['realy', entry('Adverb', 'Misspelling of really.')],
    ['wrnt', entry('Noun', 'Abbreviation of warrant.')],
    ['tm', entry('Adverb', ' Abbreviation of tomorrow.')],
    ['gg', entry('Interjection', ' Initialism of good game.', ' Initialism of good going.')],
  ])('rejects %s', (word, e) => {
    expect(parseEn({ en: [e] }, word).verified).toBe(false);
    expect(parseSv({ sv: [e] }, 'sv', word).verified).toBe(false);
    expect(parseEs({ es: [e] } as never, word).verified).toBe(false);
  });

  it('keeps a word with one real definition beside a pointer', () => {
    const body = { en: [entry('Interjection', 'Initialism of good game.'), entry('Noun', 'Loss, defeat, game over.')] };
    expect(parseEn(body, 'gg').verified).toBe(true);
  });

  it('keeps inflection pointers (plural, past tense) as real words', () => {
    expect(parseEn({ en: [entry('Noun', 'plural of cat')] }, 'cats').verified).toBe(true);
  });

  it('keeps ordinary words and entries without definition text', () => {
    expect(parseEn({ en: [entry('Noun', 'A photographic self-portrait.')] }, 'selfie').verified).toBe(true);
    expect(parseEn({ en: [{ partOfSpeech: 'Noun' }] }, 'cat').verified).toBe(true);
  });
});
