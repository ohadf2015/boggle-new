/**
 * AI lesson enrichment also fills the two newer per-word fields:
 * `meanings` (multiple-meaning practice) and `morphology` (roots & affixes).
 *
 * Both are opportunistic — a word with one sense and no teachable root must
 * come back without them rather than with padding.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  buildEnrichPrompt,
  parseEnrichResponse,
  mergeEnrichment,
  wordsNeedingEnrichment,
  CORE_ENRICHABLE_FIELDS,
  ENRICHABLE_FIELDS,
} from '../vocabEnrich';

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  canIntegrate: true,
  ...extra,
});

describe('buildEnrichPrompt', () => {
  it('asks for the new fields and says when to omit them', () => {
    const prompt = buildEnrichPrompt(['bank'], 'en');
    expect(prompt).toContain('"meanings"');
    expect(prompt).toContain('"morphology"');
    expect(prompt).toMatch(/omit the key entirely/i);
  });
});

describe('parseEnrichResponse', () => {
  it('keeps two or more senses and normalises word parts', () => {
    const raw = JSON.stringify({
      bank: {
        definition: 'a place that keeps money',
        meanings: ['the land beside a river', 'a place that keeps money'],
        morphology: { root: 'banc-', rootMeaning: ' bench ', prefix: '' },
      },
    });
    const parsed = parseEnrichResponse(raw, ['bank']);
    expect(parsed.bank.meanings).toEqual(['the land beside a river', 'a place that keeps money']);
    expect(parsed.bank.morphology).toEqual({ root: 'banc', rootMeaning: 'bench' });
  });

  it('drops a single sense rather than pretending the word is multi-meaning', () => {
    const raw = JSON.stringify({ dog: { meanings: ['a pet animal'] } });
    expect(parseEnrichResponse(raw, ['dog']).dog.meanings).toBeUndefined();
  });

  it('drops morphology with no real word part', () => {
    const raw = JSON.stringify({ dog: { morphology: { rootMeaning: 'animal' } } });
    expect(parseEnrichResponse(raw, ['dog']).dog.morphology).toBeUndefined();
    expect(parseEnrichResponse(JSON.stringify({ dog: { morphology: 'nope' } }), ['dog']).dog.morphology)
      .toBeUndefined();
  });

  it('de-duplicates senses that only differ in case', () => {
    const raw = JSON.stringify({ bank: { meanings: ['A River Edge', 'a river edge'] } });
    expect(parseEnrichResponse(raw, ['bank']).bank.meanings).toBeUndefined();
  });
});

describe('mergeEnrichment', () => {
  it('fills empty meanings and morphology and reports both as filled', () => {
    const { words, filled } = mergeEnrichment(
      [w('bank')],
      { bank: { meanings: ['a river edge', 'a money place'], morphology: { root: 'banc', rootMeaning: 'bench' } } }
    );
    expect(words[0].meanings).toEqual(['a river edge', 'a money place']);
    expect(words[0].morphology).toEqual({ root: 'banc', rootMeaning: 'bench' });
    expect(filled.bank).toEqual(expect.arrayContaining(['meanings', 'morphology']));
  });

  it('never overwrites word parts the teacher already typed', () => {
    const teacher = w('bank', { morphology: { root: 'mine' } });
    const { words, filled } = mergeEnrichment([teacher], {
      bank: { morphology: { root: 'banc', rootMeaning: 'bench' } },
    });
    expect(words[0].morphology).toEqual({ root: 'mine' });
    expect(filled.bank).toBeUndefined();
  });
});

describe('wordsNeedingEnrichment', () => {
  it('ignores the two opportunistic fields, so a filled word is never nagged', () => {
    const full = w('happy', {
      definition: 'feeling joy',
      synonyms: ['glad'],
      antonyms: ['sad'],
      example: 'The ___ dog barked.',
    });
    expect(wordsNeedingEnrichment([full])).toEqual([]);
    expect([...CORE_ENRICHABLE_FIELDS]).toEqual(['definition', 'synonyms', 'antonyms', 'example']);
    expect(ENRICHABLE_FIELDS).toContain('meanings');
    expect(ENRICHABLE_FIELDS).toContain('morphology');
  });
});
