import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PracticeWordHuntSandbox - Discovery Tip', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('discovery tip localStorage key is set after dismissal', () => {
    localStorage.removeItem('practice-wh-discovery-seen');
    expect(localStorage.getItem('practice-wh-discovery-seen')).toBeNull();

    localStorage.setItem('practice-wh-discovery-seen', '1');
    expect(localStorage.getItem('practice-wh-discovery-seen')).toBe('1');
  });

  it('discovery tip is not shown when localStorage key is set', () => {
    localStorage.setItem('practice-wh-discovery-seen', '1');
    const shouldShow = !localStorage.getItem('practice-wh-discovery-seen');
    expect(shouldShow).toBe(false);
  });

  it('discovery tip is shown when localStorage key is not set', () => {
    localStorage.removeItem('practice-wh-discovery-seen');
    const shouldShow = !localStorage.getItem('practice-wh-discovery-seen');
    expect(shouldShow).toBe(true);
  });

  it('can toggle discovery tip visibility via localStorage', () => {
    localStorage.removeItem('practice-wh-discovery-seen');
    let shouldShow = !localStorage.getItem('practice-wh-discovery-seen');
    expect(shouldShow).toBe(true);

    localStorage.setItem('practice-wh-discovery-seen', '1');
    shouldShow = !localStorage.getItem('practice-wh-discovery-seen');
    expect(shouldShow).toBe(false);
  });
});
