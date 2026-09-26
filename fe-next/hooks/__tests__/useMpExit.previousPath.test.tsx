/**
 * back-from-entry after a client-side hop: `document.referrer` still names the
 * first page of the session (or nothing), so the tracked in-app history wins;
 * the referrer is only the fallback for a hard (full document) arrival.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));

import { useMpExit, readPreviousInAppPath } from '../useMpExit';
import { recordInAppPath, resetInAppPathHistory } from '@/lib/navigation/previousInAppPath';

const setReferrer = (v: string) => Object.defineProperty(document, 'referrer', { configurable: true, value: v });

describe('readPreviousInAppPath with SPA history', () => {
  beforeEach(() => {
    resetInAppPathHistory();
    push.mockReset();
    setReferrer('');
  });

  it('prefers the tracked SPA route over a stale referrer', () => {
    setReferrer(`${window.location.origin}/en`);
    recordInAppPath('/en/daily');
    recordInAppPath('/en/multiplayer');
    expect(readPreviousInAppPath()).toBe('/en/daily');
  });

  it('falls back to the referrer when no SPA hop was tracked (hard arrival)', () => {
    setReferrer(`${window.location.origin}/en/leaderboard`);
    recordInAppPath('/en/multiplayer');
    expect(readPreviousInAppPath()).toBe('/en/leaderboard');
  });

  it('back-from-entry outside the page navigates to the tracked route', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('/en/multiplayer');
    const { result } = renderHook(() => useMpExit());
    result.current('back-from-entry');
    expect(push).toHaveBeenCalledWith('/en/daily');
  });
});
