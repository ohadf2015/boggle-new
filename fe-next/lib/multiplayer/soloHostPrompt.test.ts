import { describe, it, expect } from 'vitest';
import { shouldShowSoloPlayPrompt } from './soloHostPrompt';

/**
 * Pure decision for the solo-host "play vs bots now" prompt.
 *
 * Context (PostHog 2026-06): the dominant MP pre-game drop is a solo host alone
 * in the lobby (no human guest, classic) leaving before any game starts —
 * ~37% of host sessions. The host CAN already start (the Start button fills
 * bots), but nothing tells them solo-vs-bots is possible, and a public lobby
 * shows a silent 15s dead-air window before the bot-countdown banner appears.
 * This prompt replaces that dead air with an explicit, actionable CTA shown
 * from t=0 — but must stand down once a bot-fill countdown is already running
 * (that banner then owns the messaging) and whenever a human guest is present.
 */
describe('shouldShowSoloPlayPrompt', () => {
  it('shows when a PUBLIC host is alone in the waiting lobby and no bot countdown is running', () => {
    expect(
      shouldShowSoloPlayPrompt({ humanGuestCount: 0, gameState: 'waiting', botCountdownActive: false, isPrivate: false }),
    ).toBe(true);
  });

  it('hides once a bot-fill countdown is already running (the countdown banner owns the messaging)', () => {
    expect(
      shouldShowSoloPlayPrompt({ humanGuestCount: 0, gameState: 'waiting', botCountdownActive: true, isPrivate: false }),
    ).toBe(false);
  });

  it('hides as soon as a human guest is present (normal lobby, no rescue needed)', () => {
    expect(
      shouldShowSoloPlayPrompt({ humanGuestCount: 1, gameState: 'waiting', botCountdownActive: false, isPrivate: false }),
    ).toBe(false);
  });

  it('hides outside the waiting state (game already started or ended)', () => {
    expect(
      shouldShowSoloPlayPrompt({ humanGuestCount: 0, gameState: 'playing', botCountdownActive: false, isPrivate: false }),
    ).toBe(false);
  });

  it('hides for a PRIVATE/classroom host — they wait on specific humans, not bots (matches the alone-timer exclusion)', () => {
    expect(
      shouldShowSoloPlayPrompt({ humanGuestCount: 0, gameState: 'waiting', botCountdownActive: false, isPrivate: true }),
    ).toBe(false);
  });
});
