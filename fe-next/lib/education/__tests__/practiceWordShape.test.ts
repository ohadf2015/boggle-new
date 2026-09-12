/**
 * `lessons.words` is a jsonb column, and it holds two different shapes in the
 * wild: the lesson builder writes objects with definitions, while seeded and
 * imported lists are plain strings. Every practice mode types its prop as
 * `VocabularyWord[]` and reads `entry.word`, so a string list reached Spelling
 * as eight `undefined`s — one of which threw inside a sort comparator and put
 * "LET'S GET YOU BACK!" over the whole round.
 */
import { describe, it, expect } from 'vitest';
import { toVocabularyWords } from '../practiceWordShape';

describe('toVocabularyWords', () => {
  it('GIVEN a list of plain strings WHEN normalised THEN each becomes a vocabulary word', () => {
    expect(toVocabularyWords(['STAR', 'MOON'])).toEqual([
      { word: 'STAR', canIntegrate: true },
      { word: 'MOON', canIntegrate: true },
    ]);
  });

  it('GIVEN objects already in shape WHEN normalised THEN they pass through untouched', () => {
    const rich = { word: 'brave', definition: 'not afraid', canIntegrate: true };
    expect(toVocabularyWords([rich])[0]).toBe(rich);
  });

  it('GIVEN a mixed list WHEN normalised THEN both shapes survive', () => {
    const result = toVocabularyWords(['STAR', { word: 'brave', definition: 'not afraid' }]);
    expect(result.map((entry) => entry.word)).toEqual(['STAR', 'brave']);
    expect(result[1].definition).toBe('not afraid');
  });

  it('GIVEN junk entries WHEN normalised THEN they are dropped rather than passed on', () => {
    expect(toVocabularyWords([null, undefined, 42, '', '   ', {}])).toEqual([]);
  });

  it('GIVEN nothing WHEN normalised THEN the result is an empty list, never a throw', () => {
    expect(toVocabularyWords(null)).toEqual([]);
    expect(toVocabularyWords(undefined)).toEqual([]);
  });

  it('GIVEN the same input twice WHEN normalised THEN the result is referentially stable', () => {
    // The lesson page keys memos and effects on this array.
    const raw: unknown[] = ['STAR'];
    expect(toVocabularyWords(raw)).toEqual(toVocabularyWords(raw));
  });
});
