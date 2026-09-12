/**
 * @vitest-environment jsdom
 *
 * "No page scroll during play" — RED first.
 *
 * The game shipped a hand-rolled lock: inline `overflow:hidden` on BOTH
 * `documentElement` and `body`. Measured live at 390x844 on 2026-09-12 the page
 * still had `scrollHeight` 903 against a 844 viewport and still scrolled 59px
 * behind the fixed overlay. Two reasons, and the hand-rolled lock can fix
 * neither:
 *
 * 1. `app/globals.css:2853` declares `html { overflow: visible !important }`.
 *    An `!important` declaration beats an inline style, so the `documentElement`
 *    half of the lock never applied at all — it was dead code that read as
 *    protection.
 *
 * 2. The 59px is not overflow, it is HEIGHT: `html.has-global-bottom-nav body`
 *    takes `padding-bottom: var(--bottom-stack-height)` (globals.css:3755) to
 *    clear the global bottom nav. That padding is added to `.screen-fit` AND to
 *    `.screen-fit-locked`, so locking the body does not remove it — a locked
 *    body is still 903px tall, and `overflow:hidden` blocks the gesture without
 *    removing the scrollable overflow underneath.
 *
 * The app already owns the right answer, and it is the one thing that fixes
 * both: `useHideNavigation()` → `setIsInGame(true)`. That hides the global
 * bottom nav, which drops `has-global-bottom-nav` off `<html>` (the nav's own
 * test pins this: `__tests__/components/GlobalBottomNav.test.tsx:188`), so the
 * padding disappears and the document is exactly viewport height — nothing to
 * scroll rather than scrolling suppressed. It also swaps the body to
 * `.screen-fit-locked` via NavigationProvider.
 *
 * So this file pins the CONTRACT, not the CSS: the game declares itself in-game
 * for exactly as long as it is mounted, and releases the app on the way out.
 * `useHideNavigation` degrades to a no-op outside a provider, which is why this
 * renders bare — a homework share link must never depend on a provider being
 * there.
 */
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapGame } from '../MissGapGame';

const setIsInGame = vi.fn();

vi.mock('@/contexts/NavigationContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/NavigationContext')>();
  return { ...actual, useHideNavigation: () => setIsInGame };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn() }));
vi.mock('../missGapSound', () => ({
  useMissGapSound: () => vi.fn(),
  HOMEWORK_SOUNDS: {},
  readSfxSetting: () => ({ muted: false, volume: 1 }),
}));

function renderGame() {
  return render(
    <MissGapGame
      classKey="week 3::ms. g"
      lesson="Week 3"
      teacher="Ms. G"
      dueDate="2026-09-30"
      words={['bridge', 'anchor', 'quiver', 'harbour']}
      initialStreak={2}
      onClose={vi.fn()}
    />,
  );
}

describe('MissGapGame — the page cannot scroll while it is open', () => {
  beforeEach(() => {
    setIsInGame.mockClear();
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
  });

  it('declares itself in-game on mount, so the bottom nav and its 59px of body padding go away', () => {
    renderGame();
    // Not merely "was called" — called with true. A call with `false` here would
    // read as a lock in a spy assertion while leaving the nav on screen.
    expect(setIsInGame).toHaveBeenCalledWith(true);
  });

  it('hands the app back on unmount, so the nav returns when the student exits', () => {
    const { unmount } = renderGame();
    setIsInGame.mockClear();
    act(() => unmount());
    expect(setIsInGame).toHaveBeenCalledWith(false);
  });

  it('still locks the body itself, so a host that mounts no NavigationProvider is covered', () => {
    // The share link is a cold URL. If it ever renders outside the app layout,
    // `useHideNavigation` is a no-op and this inline lock is the only thing
    // standing between the student and a scrolling page.
    const { unmount } = renderGame();
    expect(document.body.style.overflow).toBe('hidden');
    act(() => unmount());
    expect(document.body.style.overflow).toBe('');
  });

  it('also takes the education shell lock, which is the only rule that drops the cookie sheet reservation', () => {
    // `setIsInGame(true)` drops `has-global-bottom-nav` and with it the bottom
    // stack padding — but NOT `html.has-cookie-consent body.screen-fit-locked`
    // (globals.css:3785), which keeps reserving the sheet's measured height on a
    // locked body. globals.css:4033 undoes that reservation for exactly one
    // class, `edu-shell-locked`, and hands it to `.edu-shell-scroll` instead.
    // Live on 2026-09-12 that sheet was 398px and re-rendered on every
    // navigation, so without this the student's first screen is a 446px-tall
    // shell with the START button under a fixed band.
    const { unmount } = renderGame();
    expect(document.body.classList.contains('edu-shell-locked')).toBe(true);
    act(() => unmount());
    expect(document.body.classList.contains('edu-shell-locked')).toBe(false);
  });

  it('does not try to lock documentElement, which globals.css overrides anyway', () => {
    // `html { overflow: visible !important }` wins over an inline style. Writing
    // it anyway is a no-op that looks like protection in review — the exact
    // shape of pitfalls Class 4. Keep it gone.
    renderGame();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
