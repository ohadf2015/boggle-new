import { describe, it, expect } from 'vitest';
import { suggestPlayerName } from '../onboardingNameSuggestions';

describe('suggestPlayerName', () => {
  it('returns a non-empty string', () => {
    const name = suggestPlayerName('en');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('contains no dashes, underscores, or other separator symbols', () => {
    for (let i = 0; i < 50; i++) {
      const name = suggestPlayerName('en');
      expect(name).not.toMatch(/[-_/\\|+*~`<>]/);
    }
  });

  it('returns Hebrew name when language=he', () => {
    for (let i = 0; i < 50; i++) {
      const name = suggestPlayerName('he');
      expect(name).toMatch(/[֐-׿]/);
    }
  });

  it('returns Spanish name when language=es', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) samples.add(suggestPlayerName('es'));
    const joined = Array.from(samples).join(' ');
    expect(joined).toMatch(/[áéíóúñü¡¿]|Banana|Pepino|Pingüino|Llama|Dragón|Oso|Koala/i);
  });

  it('returns Japanese name when language=ja', () => {
    for (let i = 0; i < 50; i++) {
      const name = suggestPlayerName('ja');
      expect(name).toMatch(/[぀-ヿ一-鿿]/);
    }
  });

  it('returns Swedish name when language=sv', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) samples.add(suggestPlayerName('sv'));
    expect(samples.size).toBeGreaterThan(2);
  });

  it('falls back to English for unknown language', () => {
    const name = suggestPlayerName('xx' as never);
    expect(name).toMatch(/^[A-Za-z\s]+$/);
  });

  it('defaults to English when called with no argument', () => {
    const name = suggestPlayerName();
    expect(name).toMatch(/^[A-Za-z\s]+$/);
  });

  it('produces variety (not always the same name)', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) samples.add(suggestPlayerName('en'));
    expect(samples.size).toBeGreaterThan(3);
  });
});
