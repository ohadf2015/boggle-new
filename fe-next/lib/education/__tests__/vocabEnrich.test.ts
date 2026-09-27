/**
 * vocabEnrich — pure helpers behind the "fill in missing definitions,
 * synonyms & examples" AI button. Prompt building, response parsing and the
 * ONLY-FILL-EMPTY merge are all testable without Vertex.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  MAX_ENRICH_WORDS,
  buildEnrichPrompt,
  parseEnrichResponse,
  mergeEnrichment,
  wordsNeedingEnrichment,
} from '../vocabEnrich';

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({ word, canIntegrate: true, ...extra });

describe('vocabEnrich', () => {
  describe('buildEnrichPrompt', () => {
    it('asks for JSON keyed by word, middle-school level, in the lesson language', () => {
      const prompt = buildEnrichPrompt(['happy', 'brave'], 'es');
      expect(prompt).toContain('Spanish');
      expect(prompt).toMatch(/middle[- ]school/i);
      expect(prompt).toContain('"happy"');
      expect(prompt).toContain('"brave"');
      expect(prompt).toContain('___');
      expect(prompt).toMatch(/JSON/);
    });

    it('exposes the batch cap', () => {
      expect(MAX_ENRICH_WORDS).toBe(60);
    });
  });

  describe('parseEnrichResponse', () => {
    it('parses a well-formed JSON object and normalises fields', () => {
      const text = JSON.stringify({
        Happy: { definition: ' feeling joy ', synonyms: ['glad', ' cheerful ', ''], antonyms: ['sad'], example: 'The ___ dog barked.' },
        brave: { definition: 'not afraid', synonyms: 'bold, fearless', antonyms: [], example: 'The brave knight fought.' },
      });
      const parsed = parseEnrichResponse(text, ['happy', 'brave']);
      expect(parsed.happy).toEqual({
        definition: 'feeling joy',
        synonyms: ['glad', 'cheerful'],
        antonyms: ['sad'],
        example: 'The ___ dog barked.',
      });
      // comma string tolerated, empty antonyms dropped, example gets its blank
      expect(parsed.brave).toEqual({
        definition: 'not afraid',
        synonyms: ['bold', 'fearless'],
        example: 'The ___ knight fought.',
      });
    });

    it('tolerates markdown fences and prose around the JSON', () => {
      const text = 'Sure! Here you go:\n```json\n{"happy":{"definition":"feeling joy"}}\n```\nDone.';
      expect(parseEnrichResponse(text, ['happy'])).toEqual({ happy: { definition: 'feeling joy' } });
    });

    it('ignores words that were not requested and drops an example with no blank and no word', () => {
      const text = JSON.stringify({
        happy: { example: 'A sentence about nothing.' },
        intruder: { definition: 'x' },
      });
      const parsed = parseEnrichResponse(text, ['happy']);
      expect(parsed.intruder).toBeUndefined();
      expect(parsed.happy).toEqual({});
    });

    it('caps synonym/antonym lists at 4 and never echoes the word itself', () => {
      const text = JSON.stringify({ happy: { synonyms: ['happy', 'a', 'b', 'c', 'd', 'e'] } });
      expect(parseEnrichResponse(text, ['happy']).happy.synonyms).toEqual(['a', 'b', 'c', 'd']);
    });

    it('returns {} for garbage', () => {
      expect(parseEnrichResponse('nope', ['happy'])).toEqual({});
      expect(parseEnrichResponse('[1,2]', ['happy'])).toEqual({});
    });
  });

  describe('mergeEnrichment', () => {
    it('fills ONLY empty fields and reports what it filled', () => {
      const words = [
        w('happy', { definition: 'teacher wrote this', synonyms: [], example: '' }),
        w('brave', { definition: '', synonyms: ['bold'] }),
      ];
      const enrichment = {
        happy: { definition: 'AI definition', synonyms: ['glad'], antonyms: ['sad'], example: 'The ___ dog.' },
        brave: { definition: 'not afraid', synonyms: ['AI syn'], example: 'The ___ knight.' },
      };
      const { words: merged, filled } = mergeEnrichment(words, enrichment);

      expect(merged[0].definition).toBe('teacher wrote this'); // untouched
      expect(merged[0].synonyms).toEqual(['glad']);
      expect(merged[0].antonyms).toEqual(['sad']);
      expect(merged[0].example).toBe('The ___ dog.');

      expect(merged[1].definition).toBe('not afraid');
      expect(merged[1].synonyms).toEqual(['bold']); // untouched
      expect(merged[1].example).toBe('The ___ knight.');

      expect(filled).toEqual({
        happy: ['synonyms', 'antonyms', 'example'],
        brave: ['definition', 'example'],
      });
      // never mutates input
      expect(words[1].definition).toBe('');
    });

    it('matches words case-insensitively and leaves unknown words alone', () => {
      const words = [w('Happy'), w('other')];
      const { words: merged, filled } = mergeEnrichment(words, { happy: { definition: 'joy' } });
      expect(merged[0].definition).toBe('joy');
      expect(merged[1]).toEqual(w('other'));
      expect(filled).toEqual({ Happy: ['definition'] });
    });
  });

  describe('wordsNeedingEnrichment', () => {
    it('lists words with at least one empty field', () => {
      const words = [
        w('full', { definition: 'd', synonyms: ['s'], antonyms: ['a'], example: 'The ___.' }),
        w('half', { definition: 'd' }),
        w('empty'),
      ];
      expect(wordsNeedingEnrichment(words)).toEqual(['half', 'empty']);
    });
  });
});
