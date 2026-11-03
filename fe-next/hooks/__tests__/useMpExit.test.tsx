/**
 * `useMpExit()` is the only way an MP screen leaves: no raw Link / router.push
 * / href to a non-MP route in any MP screen. Inside the MP page it calls the
 * page's exit (in-place reset, leaveRoom emit, classroom hub); outside it (an
 * isolated screen, a test) it falls back to the pure `mpExit` decision.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he' }) }));

import { useMpExit, MpExitProvider, readPreviousInAppPath } from '../useMpExit';

describe('useMpExit', () => {
  beforeEach(() => push.mockReset());

  it('delegates to the page exit when mounted inside the MP page', () => {
    const pageExit = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <MpExitProvider value={pageExit}>{children}</MpExitProvider>;
    const { result } = renderHook(() => useMpExit(), { wrapper });
    result.current('leave-room');
    expect(pageExit).toHaveBeenCalledWith('leave-room');
    expect(push).not.toHaveBeenCalled();
  });

  it('outside the page: back-from-entry goes to the locale root, never an external page', () => {
    const { result } = renderHook(() => useMpExit());
    result.current('back-from-entry');
    expect(push).toHaveBeenCalledWith('/he');
  });

  it('outside the page: an in-room reason returns to the MP entry, not the homepage', () => {
    const { result } = renderHook(() => useMpExit());
    result.current('room-gone');
    expect(push).toHaveBeenCalledWith('/he/multiplayer');
  });

  it('outside the page: continue-solo hands off to singleplayer', () => {
    const { result } = renderHook(() => useMpExit());
    result.current('continue-solo');
    expect(push).toHaveBeenCalledWith('/he/singleplayer?mpHandoff=1');
  });
});

describe('readPreviousInAppPath', () => {
  it('returns a same-origin referrer path, and nothing for external or MP referrers', () => {
    const set = (v: string) => Object.defineProperty(document, 'referrer', { configurable: true, value: v });
    set(`${window.location.origin}/en/daily?x=1`);
    expect(readPreviousInAppPath()).toBe('/en/daily?x=1');
    set('https://google.com/search');
    expect(readPreviousInAppPath()).toBeNull();
    set(`${window.location.origin}/en/multiplayer`);
    expect(readPreviousInAppPath()).toBeNull();
    set('');
    expect(readPreviousInAppPath()).toBeNull();
  });
});
