/**
 * guestManager — dispatches `guestStatsChanged` window event after writes.
 *
 * SignupPromptHost mounts once at provider level; without this event, the
 * useSignupPrompt hook reads stats at 0/0 on boot and never re-checks. The
 * dispatch lets subscribers (signup prompt, header chips, etc) re-render
 * when a game updates localStorage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateGuestStatsAfterGame } from '@/utils/guestManager';

beforeEach(() => {
  window.localStorage.clear();
});

describe('guestManager — guestStatsChanged event', () => {
  it('dispatches guestStatsChanged when a game completes', () => {
    const listener = vi.fn();
    window.addEventListener('guestStatsChanged', listener);

    updateGuestStatsAfterGame({ score: 50, wordCount: 5, isWinner: true });

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('guestStatsChanged', listener);
  });
});
