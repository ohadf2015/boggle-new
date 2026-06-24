import { describe, it, expect } from 'vitest';
import { alchemyDirHint } from '../dirHint';

describe('alchemyDirHint', () => {
  it('returns ↑ when guess comes before answer alphabetically', () => {
    expect(alchemyDirHint('ARTS', 'RATS', 'en')).toBe('↑');
  });
  it('returns ↓ when guess comes after answer alphabetically', () => {
    expect(alchemyDirHint('RATS', 'ARTS', 'en')).toBe('↓');
  });
  it('normalises case before comparing', () => {
    expect(alchemyDirHint('arts', 'rats', 'en')).toBe('↑');
  });
  it('trims whitespace before comparing', () => {
    expect(alchemyDirHint('  ARTS  ', 'RATS', 'en')).toBe('↑');
  });
});
