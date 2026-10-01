import { describe, it, expect } from 'vitest';
import {
  parseWordPaste,
  parseWordTable,
  mergeWords,
  wordIssue,
  gradeLevelToBand,
  defaultLibraryLanguage,
  listModerationIssues,
  paginate,
} from '../library';

describe('parseWordPaste', () => {
  it('splits a newline list', () => {
    expect(parseWordPaste('apple\nbanana\n\ncherry').map((e) => e.word)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('splits commas, semicolons, pipes, tabs-free bullets and middots on one line', () => {
    expect(parseWordPaste('apple, banana; cherry | date · elder').map((e) => e.word)).toEqual([
      'apple', 'banana', 'cherry', 'date', 'elder',
    ]);
  });

  it('never splits on plain spaces or bare hyphens', () => {
    expect(parseWordPaste('ice cream, well-known').map((e) => e.word)).toEqual(['ice cream', 'well-known']);
  });

  it('reads word - definition, word: definition and word<TAB>definition lines without splitting the definition on commas', () => {
    const entries = parseWordPaste('osmosis - water moving, slowly\nnucleus: the core, centre\nenzyme\ta protein');
    expect(entries).toEqual([
      { word: 'osmosis', definition: 'water moving, slowly' },
      { word: 'nucleus', definition: 'the core, centre' },
      { word: 'enzyme', definition: 'a protein' },
    ]);
  });

  it('strips list numbering and bullets', () => {
    expect(parseWordPaste('1. apple\n2) banana\n- cherry\n• date').map((e) => e.word)).toEqual([
      'apple', 'banana', 'cherry', 'date',
    ]);
  });

  it('splits Japanese and Hebrew list punctuation', () => {
    expect(parseWordPaste('ねこ、いぬ，とり').map((e) => e.word)).toEqual(['ねこ', 'いぬ', 'とり']);
    expect(parseWordPaste('שלום, בית').map((e) => e.word)).toEqual(['שלום', 'בית']);
  });

  it('returns nothing for whitespace', () => {
    expect(parseWordPaste('  \n , ;')).toEqual([]);
  });
});

describe('parseWordTable', () => {
  it('reads a CSV with a header row', () => {
    expect(parseWordTable('word,definition\napple,a red fruit\nbanana,"long, yellow"')).toEqual([
      { word: 'apple', definition: 'a red fruit' },
      { word: 'banana', definition: 'long, yellow' },
    ]);
  });

  it('reads TSV without a header', () => {
    expect(parseWordTable('apple\ta red fruit\nkiwi')).toEqual([
      { word: 'apple', definition: 'a red fruit' },
      { word: 'kiwi' },
    ]);
  });
});

describe('mergeWords', () => {
  it('appends new entries and skips duplicates already in the list', () => {
    const { words, added, duplicates } = mergeWords(
      [{ word: 'apple', canIntegrate: true }],
      [{ word: 'Apple' }, { word: 'kiwi', definition: 'green' }],
      'en',
    );
    expect(words.map((w) => w.word)).toEqual(['apple', 'kiwi']);
    expect(words[1]).toMatchObject({ definition: 'green', canIntegrate: true });
    expect(added).toBe(1);
    expect(duplicates).toBe(1);
  });

  it('treats Hebrew final and non-final forms and niqqud as the same word', () => {
    const { added } = mergeWords([{ word: 'שלום', canIntegrate: true }], [{ word: 'שָׁלוֹם' }], 'he');
    expect(added).toBe(0);
  });

  it('marks a word too short to play as not integrable', () => {
    const { words } = mergeWords([], [{ word: 'a' }], 'en');
    expect(words[0].canIntegrate).toBe(false);
  });
});

describe('wordIssue', () => {
  it('flags digits, length, wrong script and blocked words', () => {
    expect(wordIssue('abc1', 'en')).toBe('digits');
    expect(wordIssue('a'.repeat(31), 'en')).toBe('tooLong');
    expect(wordIssue('apple', 'he')).toBe('wrongScript');
    expect(wordIssue('שלום', 'en')).toBe('wrongScript');
    expect(wordIssue('fuck', 'en')).toBe('blocked');
    expect(wordIssue('mierda', 'es')).toBe('blocked');
  });

  it('accepts normal words in their own language, including diacritics', () => {
    expect(wordIssue('ice cream', 'en')).toBeNull();
    expect(wordIssue('äpple', 'sv')).toBeNull();
    expect(wordIssue('niño', 'es')).toBeNull();
    expect(wordIssue('שלום', 'he')).toBeNull();
    expect(wordIssue('кошка', 'ru')).toBeNull();
    expect(wordIssue('ねこ', 'ja')).toBeNull();
  });
});

describe('gradeLevelToBand', () => {
  it('maps curriculum grades onto four bands', () => {
    expect(gradeLevelToBand('grade_1')).toBe('k2');
    expect(gradeLevelToBand('grade_4')).toBe('g35');
    expect(gradeLevelToBand('grade_7')).toBe('g68');
    expect(gradeLevelToBand('grade_12')).toBe('g912');
    expect(gradeLevelToBand('nonsense')).toBeNull();
  });
});

describe('defaultLibraryLanguage', () => {
  it('defaults to the UI locale, falling back to English', () => {
    expect(defaultLibraryLanguage('he')).toBe('he');
    expect(defaultLibraryLanguage('ja')).toBe('ja');
    expect(defaultLibraryLanguage('fr')).toBe('en');
  });
});

describe('listModerationIssues', () => {
  it('rejects a blocked word in the title, description or any word', () => {
    expect(listModerationIssues({ name: 'Fruit', description: null, words: [{ word: 'apple' }] })).toEqual([]);
    expect(listModerationIssues({ name: 'Fruit', description: null, words: [{ word: 'puta' }] })).toEqual(['words']);
    expect(listModerationIssues({ name: 'shit list', description: null, words: [{ word: 'apple' }] })).toEqual(['name']);
    expect(
      listModerationIssues({ name: 'Fruit', description: null, words: [{ word: 'apple', definition: 'a whore' }] }),
    ).toEqual(['words']);
  });

  it('rejects a list too small to play', () => {
    expect(listModerationIssues({ name: 'Fruit', description: null, words: [] })).toEqual(['empty']);
  });
});

describe('paginate', () => {
  it('returns a bounded page and the page count', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, 0, 12)).toEqual({ items: items.slice(0, 12), page: 0, pageCount: 3 });
    expect(paginate(items, 9, 12)).toEqual({ items: items.slice(24), page: 2, pageCount: 3 });
    expect(paginate([], 0, 12)).toEqual({ items: [], page: 0, pageCount: 1 });
  });
});
