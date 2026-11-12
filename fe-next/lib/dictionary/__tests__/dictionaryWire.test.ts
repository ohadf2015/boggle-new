import { describe, it, expect } from 'vitest';
import { decodeDictionaryPayload, encodeDictionaryPayload, dictionaryWordsUrl } from '../sharedDictionaryFetch';

describe('encoded dictionary payload', () => {
  it('round-trips a Hebrew list without carrying any Hebrew letter on the wire', () => {
    const raw = 'שלום\nמים\nבית';
    const wire = encodeDictionaryPayload(raw);
    expect(wire).not.toMatch(/[֐-׿]/);
    expect(decodeDictionaryPayload(wire)).toBe(raw);
  });

  it('names the encoded variant with its own query flag', () => {
    expect(dictionaryWordsUrl('he')).toBe('/api/dictionary-words?lang=he');
    expect(dictionaryWordsUrl('he', { encoded: true })).toBe('/api/dictionary-words?lang=he&enc=b64');
  });
});
