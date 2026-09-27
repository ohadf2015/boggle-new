import { describe, it, expect } from 'vitest';
import { tr, interpolate } from '../eduText';

describe('tr — English fallback that survives both translator shapes', () => {
  it('returns the translation when the wide translator has one', () => {
    const t = (key: string) => (key === 'academy.x' ? 'Hola' : key);
    expect(tr(t, 'academy.x', 'Hello')).toBe('Hola');
  });

  it('prints the English fallback when the key is missing', () => {
    const t = (key: string) => key;
    expect(tr(t, 'academy.missing', 'Hello {{name}}', { name: 'Maya' })).toBe('Hello Maya');
  });

  it('never leaks a raw key from a narrow (key, params) translator', () => {
    const narrow = (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key;
    expect(tr(narrow, 'academy.y', '{count} joined', { count: 3 })).toBe('3 joined');
  });

  it('uses the wide translator fallback path (fallback, params)', () => {
    const wide = (_k: string, fb?: unknown, p?: Record<string, string | number>) =>
      typeof fb === 'string' ? interpolate(fb, p) : _k;
    expect(tr(wide, 'academy.z', '{{n}} left', { n: 2 })).toBe('2 left');
  });
});
