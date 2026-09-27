/**
 * @vitest-environment jsdom
 *
 * RED first — the homework routes must not scroll the page body.
 *
 * Measured live on 2026-09-12 at 390x844 on
 * `/en/education/miss-gap-assignment`: `documentElement.scrollHeight` 1285
 * against an 844 viewport, and `window.scrollTo(0, 9999)` actually moved the
 * page 441px. At 1440x900 the same page measured 1294 against 900. The critic
 * disqualified the piece on exactly this.
 *
 * The page's own answer at the time was a `<style>` tag writing
 * `html,body{overflow:hidden!important}`. It did not work and could not:
 *
 * 1. `app/globals.css:2853` already declares `html { overflow: visible
 *    !important }`. Two `!important` declarations at equal specificity are
 *    broken by order, and globals.css wins — so `<html>` stayed the scroll
 *    container. (Verified live: `getComputedStyle(documentElement).overflowY`
 *    read `visible` with the page's own style tag in the DOM.)
 *
 * 2. The 441px was never overflow, it is HEIGHT. `<body>` carries `.screen-fit`
 *    and `html.has-global-bottom-nav body.screen-fit` /
 *    `html.has-cookie-consent body.screen-fit` add
 *    `padding-bottom: bottom-stack + cookie-sheet` (globals.css:3755, :3785).
 *    `overflow:hidden` suppresses the gesture; it does not remove 441px of
 *    padding from a `min-height:100dvh` box.
 *
 * The app already owns the fix, written by the education-shell piece:
 * `body.edu-shell-locked` is `height:100dvh; overflow:hidden` — with
 * border-box the reservation lives INSIDE the viewport instead of adding to
 * it — and globals.css:4033 explicitly undoes the cookie-sheet reservation for
 * a shell-locked body (a rule `.screen-fit-locked` never got). This component
 * is the one line every miss-gap route mounts to get it, and it is ref-counted
 * upstream so a route transition never leaves the page unlocked for a frame.
 *
 * jsdom has no layout, so this pins the MECHANISM (the class is on the body for
 * exactly as long as the route is mounted). The pixels are verified in
 * agent-browser, not here.
 */
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { MissGapShellLock } from '../MissGapShellLock';

afterEach(() => {
  document.body.className = '';
});

describe('MissGapShellLock', () => {
  it('locks the body for as long as the route is mounted', () => {
    expect(document.body.classList.contains('edu-shell-locked')).toBe(false);
    const { unmount } = render(<MissGapShellLock />);
    expect(document.body.classList.contains('edu-shell-locked')).toBe(true);
    unmount();
    expect(document.body.classList.contains('edu-shell-locked')).toBe(false);
  });

  it('renders nothing of its own, so it can sit inside any route shell', () => {
    const { container } = render(<MissGapShellLock />);
    expect(container.innerHTML).toBe('');
  });

  it('survives a route transition where the next screen mounts before this one unmounts', () => {
    // The lock is ref-counted upstream. Without that, the overlapping mount /
    // unmount of a client-side navigation drops the class for a frame and the
    // page flashes a scrollbar — and under StrictMode's double-invoke it would
    // drop it permanently.
    const first = render(<MissGapShellLock />);
    const second = render(<MissGapShellLock />);
    first.unmount();
    expect(document.body.classList.contains('edu-shell-locked')).toBe(true);
    second.unmount();
    expect(document.body.classList.contains('edu-shell-locked')).toBe(false);
  });
});
