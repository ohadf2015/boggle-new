import { describe, it, expect } from 'vitest';
import {
  MIN_WORDS,
  buildLists,
  cleanWords,
  detectLang,
  localesFor,
  splitName,
  stripGradePrefix,
  playableWord,
  type SnapshotList,
} from '../model';
import { classifyTopic } from '../topics';

const words = (pairs: Array<[string, string]>) => pairs.map(([w, d]) => ({ w, d }));
const tenEnglish = words([
  ['cat', 'A pet'],
  ['dog', 'A pet'],
  ['cow', 'Farm'],
  ['pig', 'Farm'],
  ['hen', 'Farm'],
  ['goat', 'Farm'],
  ['duck', 'Farm'],
  ['horse', 'Farm'],
  ['sheep', 'Farm'],
  ['bee', 'Insect'],
]);

function list(over: Partial<SnapshotList>): SnapshotList {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    origin: 'curriculum',
    name: 'Farm Animals',
    description: '',
    language: 'en',
    grade: 1,
    subject: 'english',
    words: tenEnglish,
    ...over,
  };
}

describe('cleanWords', () => {
  it('given padded, blank and repeated words, when cleaned, then keeps one trimmed copy each', () => {
    const out = cleanWords(
      words([
        [' Cat ', 'pet'],
        ['cat', 'dup'],
        ['', 'blank'],
        ['  ', 'x'],
        ['dog', ''],
      ]),
    );
    expect(out.map((w) => w.word)).toEqual(['Cat', 'dog']);
    expect(out[0].definition).toBe('pet');
  });

  it('treats niqqud spellings of one Hebrew word as the same word', () => {
    const out = cleanWords(
      words([
        ['אַרְיֵה', 'Lion'],
        ['אריה', 'Lion again'],
      ]),
    );
    expect(out).toHaveLength(1);
  });
});

describe('detectLang', () => {
  it('reads the language from the words, not the column', () => {
    expect(detectLang('he', cleanWords(tenEnglish))).toBe('en');
    expect(
      detectLang(
        'he',
        cleanWords(
          words([
            ['כלב', 'dog'],
            ['חתול', 'cat'],
          ]),
        ),
      ),
    ).toBe('he');
    expect(detectLang('es', cleanWords(words([['perro', 'animal']])))).toBe('es');
  });
});

describe('localesFor', () => {
  it('English words with Hebrew glosses are offered in en and he only', () => {
    expect(
      localesFor(
        'en',
        cleanWords(
          words([
            ['dog', 'כלב - A pet'],
            ['cat', 'חתול - A pet'],
          ]),
        ),
      ),
    ).toEqual(['en', 'he']);
  });
  it('plain English lists are English-only', () => {
    expect(localesFor('en', cleanWords(tenEnglish))).toEqual(['en']);
  });
  it('Hebrew words get en only when the definitions carry an English gloss', () => {
    expect(localesFor('he', cleanWords(words([['אריה', 'Lion - מלך החיות']])))).toEqual(['he', 'en']);
    expect(localesFor('he', cleanWords(words([['אריה', 'מלך החיות']])))).toEqual(['he']);
  });
  it('Spanish lists are offered in es and en', () => {
    expect(localesFor('es', cleanWords(words([['perro', 'Animal que ladra']])))).toEqual(['es', 'en']);
  });
});

describe('names', () => {
  it('splits a bilingual name into its Latin and Hebrew halves', () => {
    expect(splitName('Farm Animals - חיות משק')).toEqual({ latin: 'Farm Animals', hebrew: 'חיות משק' });
    expect(splitName('Geography - Israel גאוגרפיה של ישראל')).toEqual({
      latin: 'Geography - Israel',
      hebrew: 'גאוגרפיה של ישראל',
    });
    expect(splitName('אוצר מילים - חיות בר')).toEqual({ latin: '', hebrew: 'אוצר מילים - חיות בר' });
  });
  it('drops grade prefixes in English, Spanish and Hebrew', () => {
    expect(stripGradePrefix('Grade 5 - Science Basics')).toBe('Science Basics');
    expect(stripGradePrefix('Grado 2 — Naturaleza y Animales')).toBe('Naturaleza y Animales');
    expect(stripGradePrefix('כיתה ה׳ — מתמטיקה')).toBe('מתמטיקה');
    expect(stripGradePrefix('אוצר מילים - חיות בר')).toBe('חיות בר');
  });
  it('strips niqqud from the word a game board receives', () => {
    expect(playableWord('אַרְיֵה')).toBe('אריה');
    expect(playableWord('Cat')).toBe('Cat');
  });
});

describe('classifyTopic', () => {
  it('maps names in three languages onto one topic id', () => {
    expect(classifyTopic('Farm Animals - חיות משק', '', 'english')).toBe('animals');
    expect(classifyTopic('אוצר מילים - חיות בר', '', 'hebrew')).toBe('animals');
    expect(classifyTopic('Grado 2 — Naturaleza y Animales', '', 'general')).toBe('animals');
    expect(classifyTopic('אוצר מילים - בית ספר', '', 'hebrew')).toBe('school');
    expect(classifyTopic('Grade 9 - Quadratics', '', 'math')).toBe('math');
    expect(classifyTopic('Bagrut Academic Words 1', '', 'english')).toBe('academic');
  });
});

describe('buildLists', () => {
  it('drops lists with fewer than MIN_WORDS real words', () => {
    const thin = list({ words: tenEnglish.slice(0, MIN_WORDS - 1).concat(words([['cat', 'dup']])) });
    expect(buildLists({ generatedAt: 'x', lists: [thin] })).toHaveLength(0);
  });

  it('keeps the larger of two near-duplicate lists in one language', () => {
    const small = list({ id: 'aaaaaa01-0000', name: 'First words' });
    const big = list({ id: 'bbbbbb02-0000', name: 'First words v2', words: [...tenEnglish, ...words([['ant', 'Insect']])] });
    const out = buildLists({ generatedAt: 'x', lists: [small, big] });
    expect(out.map((l) => l.id)).toEqual(['bbbbbb02-0000']);
  });

  it('gives every list a stable, unique, readable slug', () => {
    const a = list({ id: 'abcdef12-1', name: 'Farm Animals - חיות משק' });
    const b = list({
      id: '123456ab-2',
      name: 'אוצר מילים - חיות בר',
      language: 'he',
      words: words([
        ['אריה', 'Lion'],
        ['פיל', 'Elephant'],
        ['זאב', 'Wolf'],
        ['דוב', 'Bear'],
        ['שועל', 'Fox'],
        ['נמר', 'Tiger'],
        ['קוף', 'Monkey'],
        ['ג׳ירפה', 'Giraffe'],
        ['צבי', 'Deer'],
        ['נחש', 'Snake'],
      ]),
    });
    const out = buildLists({ generatedAt: 'x', lists: [a, b] });
    expect(out.find((l) => l.id === a.id)?.slug).toBe('farm-animals-grade-1-abcdef');
    expect(out.find((l) => l.id === b.id)?.slug).toBe('animals-grade-1-123456');
  });
});
