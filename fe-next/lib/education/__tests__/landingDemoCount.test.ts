import { describe, it, expect } from 'vitest';
import { wordsFoundKey } from '../landingDemo';

describe('wordsFoundKey', () => {
  it('uses the singular key for exactly one word in English', () => {
    expect(wordsFoundKey(1, 'en')).toBe('eg6Land.demo.wordsFoundOne');
  });

  it('uses the base key for zero and many', () => {
    expect(wordsFoundKey(0, 'en')).toBe('eg6Land.demo.wordsFound');
    expect(wordsFoundKey(2, 'en')).toBe('eg6Land.demo.wordsFound');
  });

  it('separates Russian one, few and many', () => {
    expect(wordsFoundKey(1, 'ru')).toBe('eg6Land.demo.wordsFoundOne');
    expect(wordsFoundKey(3, 'ru')).toBe('eg6Land.demo.wordsFoundFew');
    expect(wordsFoundKey(5, 'ru')).toBe('eg6Land.demo.wordsFound');
    expect(wordsFoundKey(21, 'ru')).toBe('eg6Land.demo.wordsFoundOne');
  });
});
