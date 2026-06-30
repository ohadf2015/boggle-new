import { describe, it, expect } from 'vitest';
import { validateSuggestionInput } from '../suggestionValidation';

describe('validateSuggestionInput', () => {
  it('rejects an invalid language', () => {
    expect(validateSuggestionInput('xx', 'גלידה')).toEqual({ ok: false, error: 'invalid_language' });
  });

  it('rejects a too-short word (latin)', () => {
    expect(validateSuggestionInput('en', 'cat')).toEqual({ ok: false, error: 'invalid_length' });
  });

  it('rejects a too-long word (latin)', () => {
    expect(validateSuggestionInput('en', 'elephants')).toEqual({ ok: false, error: 'invalid_length' });
  });

  it('rejects a non-word (digits / wrong charset)', () => {
    expect(validateSuggestionInput('en', 'HELLO5')).toEqual({ ok: false, error: 'invalid_word' });
  });

  it('accepts a good Hebrew word and returns it uppercased + trimmed', () => {
    expect(validateSuggestionInput('he', '  גלידה ')).toEqual({ ok: true, word: 'גלידה' });
  });

  it('accepts a good English word', () => {
    expect(validateSuggestionInput('en', 'planet')).toEqual({ ok: true, word: 'PLANET' });
  });

  it('uses the 2-4 length window for Japanese', () => {
    expect(validateSuggestionInput('ja', '時間')).toEqual({ ok: true, word: '時間' });
  });
});
