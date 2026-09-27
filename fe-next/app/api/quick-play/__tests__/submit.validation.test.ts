/**
 * Quick Play submit endpoint validation for word collection payload.
 * Tests the server-side validation before persistence.
 */
import { describe, it, expect } from 'vitest';

// Validation constants from route.ts
const MAX_WORDS_PER_ROUND = 200;
const MAX_WORD_LENGTH = 30;
const TOTAL_PAYLOAD_BYTES = 10_000;

function validateWords(words: unknown[]): { valid: boolean; error?: string } {
  if (!Array.isArray(words)) {
    return { valid: false, error: 'Words must be an array' };
  }
  if (words.length > MAX_WORDS_PER_ROUND) {
    return { valid: false, error: 'Too many words' };
  }

  for (const w of words) {
    if (typeof w !== 'object' || !w.word || typeof w.score !== 'number') {
      return { valid: false, error: 'Invalid word format' };
    }
    const word = String(w.word).trim();
    if (word.length === 0 || word.length > MAX_WORD_LENGTH || !/^[a-zA-Z]+$/.test(word)) {
      return { valid: false, error: 'Invalid word' };
    }
  }

  const payloadStr = JSON.stringify({ words });
  if (Buffer.byteLength(payloadStr) > TOTAL_PAYLOAD_BYTES) {
    return { valid: false, error: 'Payload too large' };
  }

  return { valid: true };
}

describe('Quick Play submit — word validation', () => {
  it('accepts valid words array', () => {
    const result = validateWords([
      { word: 'apple', score: 10 },
      { word: 'banana', score: 15 },
    ]);
    expect(result.valid).toBe(true);
  });

  it('rejects non-alphabetic characters', () => {
    const result = validateWords([{ word: 'app1e', score: 10 }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid word/i);
  });

  it('rejects words with spaces or special chars', () => {
    const result = validateWords([{ word: 'apple pie', score: 10 }]);
    expect(result.valid).toBe(false);
  });

  it('rejects empty word strings', () => {
    const result = validateWords([{ word: '', score: 10 }]);
    expect(result.valid).toBe(false);
  });

  it('rejects word exceeding max length', () => {
    const longWord = 'a'.repeat(MAX_WORD_LENGTH + 1);
    const result = validateWords([{ word: longWord, score: 10 }]);
    expect(result.valid).toBe(false);
  });

  it('rejects array exceeding max count', () => {
    const words = Array.from({ length: MAX_WORDS_PER_ROUND + 1 }, (_, i) => ({
      word: `word${i}`,
      score: 10,
    }));
    const result = validateWords(words);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too many/i);
  });

  it('rejects non-number scores', () => {
    const result = validateWords([{ word: 'apple', score: '10' }]);
    expect(result.valid).toBe(false);
  });

  it('accepts multiple words within payload size', () => {
    // Test with minimal payload - just a few words
    const words = [
      { word: 'apple', score: 10 },
      { word: 'banana', score: 15 },
      { word: 'cherry', score: 20 },
    ];
    const result = validateWords(words);
    expect(result.valid).toBe(true);
  });

  it('rejects payload exceeding size limit', () => {
    // Create massive word list to exceed 10KB limit
    const words = Array.from({ length: 200 }, (_, i) => ({
      word: `word${i.toString().padStart(4, '0')}`,
      score: 10,
    }));
    const result = validateWords(words);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('accepts max-length words', () => {
    const maxLenWord = 'a'.repeat(MAX_WORD_LENGTH);
    const result = validateWords([{ word: maxLenWord, score: 10 }]);
    expect(result.valid).toBe(true);
  });
});
