import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getGuestNamePromptArm,
  markGuestNamePromptDismissedToday,
  wasGuestNamePromptDismissedToday,
} from '../guestNamePromptArm';

describe('getGuestNamePromptArm', () => {
  it('gives the same guest the same arm every time', () => {
    expect(getGuestNamePromptArm('fp-abc')).toBe(getGuestNamePromptArm('fp-abc'));
  });

  it('splits guests roughly in half', () => {
    let closable = 0;
    for (let i = 0; i < 2000; i++) if (getGuestNamePromptArm(`fp-${i}`) === 'closable') closable++;
    expect(closable).toBeGreaterThan(900);
    expect(closable).toBeLessThan(1100);
  });

  it('keeps a guest with no fingerprint on the forced prompt', () => {
    expect(getGuestNamePromptArm(null)).toBe('forced');
  });
});

describe('prompt dismissal', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('lasts for the rest of the day only', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
    expect(wasGuestNamePromptDismissedToday()).toBe(false);
    markGuestNamePromptDismissedToday();
    expect(wasGuestNamePromptDismissedToday()).toBe(true);

    vi.setSystemTime(new Date('2026-11-06T10:00:00Z'));
    expect(wasGuestNamePromptDismissedToday()).toBe(false);
  });
});
