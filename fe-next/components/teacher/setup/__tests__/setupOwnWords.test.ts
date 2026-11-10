import { describe, expect, it } from 'vitest';
import { MIN_PASTED_WORDS } from '@/components/teacher/dashboard/quickLaunchIntent';
import { readSetupWords, SETUP_MIN_OWN_WORDS, usesOwnWords } from '../setupOwnWords';

const words = (text: string, lang: Parameters<typeof readSetupWords>[1]) => readSetupWords(text, lang).words.map((w) => w.word);

describe('readSetupWords', () => {
  it('Given words split by commas and new lines, When read, Then each one is a word ready for the board', () => {
    const out = readSetupWords('cat, dog\nsun\n\nmoon', 'en');
    expect(out.words.map((w) => w.word)).toEqual(['cat', 'dog', 'sun', 'moon']);
    expect(out.words.every((w) => typeof w.canIntegrate === 'boolean')).toBe(true);
    expect(out.dropped).toBe(0);
  });

  it('Given an empty box, Then there are no words and nothing dropped', () => {
    expect(readSetupWords('   \n ', 'en')).toEqual({ words: [], dropped: 0 });
  });

  it('Given Hebrew words with and without niqqud, When read for a Hebrew class, Then they are kept', () => {
    expect(words('שָׁלוֹם, ספר\nבית', 'he')).toEqual(['שָׁלוֹם', 'ספר', 'בית']);
  });

  it('Given Spanish words with ñ and accents in any case, When read for a Spanish class, Then they are kept', () => {
    expect(words('niño, CAMIÓN, Pingüino', 'es')).toEqual(['niño', 'CAMIÓN', 'Pingüino']);
  });

  it('Given the same word twice in different case, Then it counts once and is not reported as dropped', () => {
    const out = readSetupWords('Apple, apple, APPLE, pear', 'en');
    expect(out.words.map((w) => w.word)).toEqual(['Apple', 'pear']);
    expect(out.dropped).toBe(0);
  });

  it('Given phrases, digits and words in another script, Then they are left out and counted as dropped', () => {
    const out = readSetupWords('rely on, cat3, שלום, dog', 'en');
    expect(out.words.map((w) => w.word)).toEqual(['dog']);
    expect(out.dropped).toBe(3);
  });

  it('Given English words in a Hebrew class, Then none count, so the starter list is used', () => {
    const out = readSetupWords('cat, dog, sun, moon', 'he');
    expect(out.words).toEqual([]);
    expect(out.dropped).toBe(4);
    expect(usesOwnWords(out.words)).toBe(false);
  });

  it('Given the shared paste minimum, Then setup uses that same number, so setup and the invite step agree', () => {
    expect(SETUP_MIN_OWN_WORDS).toBe(MIN_PASTED_WORDS);
    expect(usesOwnWords(readSetupWords('a1, cat, dog, sun', 'en').words)).toBe(true);
    expect(usesOwnWords(readSetupWords('cat, dog', 'en').words)).toBe(false);
  });
});
