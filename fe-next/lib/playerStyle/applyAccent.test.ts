// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { applyAccentVar, ACCENT_VAR, ACCENT_FOREGROUND_VAR } from './applyAccent';

describe('applyAccentVar', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty(ACCENT_VAR);
    document.documentElement.style.removeProperty(ACCENT_FOREGROUND_VAR);
  });

  it('sets the --accent variable to the given hex', () => {
    applyAccentVar(document.documentElement, '#ff2d4b');
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('#ff2d4b');
  });

  it('also sets --accent-foreground to a readable color for the accent', () => {
    applyAccentVar(document.documentElement, '#3b6fff'); // mid blue → black wins
    expect(document.documentElement.style.getPropertyValue(ACCENT_FOREGROUND_VAR)).toBe('#000000');
    applyAccentVar(document.documentElement, '#1a1a2e'); // dark navy → white wins
    expect(document.documentElement.style.getPropertyValue(ACCENT_FOREGROUND_VAR)).toBe('#ffffff');
  });

  it('removes BOTH overrides when hex is null (falls back to CSS default → zero change)', () => {
    applyAccentVar(document.documentElement, '#ff2d4b');
    applyAccentVar(document.documentElement, null);
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('');
    expect(document.documentElement.style.getPropertyValue(ACCENT_FOREGROUND_VAR)).toBe('');
  });

  it('is a no-op when element is null (SSR-safe)', () => {
    expect(() => applyAccentVar(null, '#fff')).not.toThrow();
  });
});
