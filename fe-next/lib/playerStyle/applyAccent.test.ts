// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { applyAccentVar, ACCENT_VAR } from './applyAccent';

describe('applyAccentVar', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty(ACCENT_VAR);
  });

  it('sets the --accent variable to the given hex', () => {
    applyAccentVar(document.documentElement, '#ff2d4b');
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('#ff2d4b');
  });

  it('removes the override when hex is null (falls back to CSS default → zero change)', () => {
    applyAccentVar(document.documentElement, '#ff2d4b');
    applyAccentVar(document.documentElement, null);
    expect(document.documentElement.style.getPropertyValue(ACCENT_VAR)).toBe('');
  });

  it('is a no-op when element is null (SSR-safe)', () => {
    expect(() => applyAccentVar(null, '#fff')).not.toThrow();
  });
});
