/**
 * One line per miss-gap route: the page body stops scrolling.
 *
 * Every homework surface is a single card (or a card plus the who-played
 * panel) that has no business scrolling the document. It scrolled anyway, and
 * not because the content was too tall: `<body>` ships `.screen-fit`
 * (`min-height:100dvh; overflow-y:auto`) and then
 * `html.has-global-bottom-nav body.screen-fit` +
 * `html.has-cookie-consent body.screen-fit` add
 * `padding-bottom: bottom-stack + cookie-sheet` on top of it. Measured live at
 * 390x844 that padding alone was 441px, so the document stood 1285px tall for
 * ~500px of content and the page really did scroll 441px.
 *
 * The route used to fight that with its own `<style>` tag setting
 * `html,body{overflow:hidden!important}`. Both halves were wrong:
 * `app/globals.css:2853` already declares `html { overflow: visible
 * !important }` and wins on order, and `overflow:hidden` suppresses a gesture
 * without removing padding from a `min-height` box.
 *
 * `body.edu-shell-locked` (written by the education-shell piece) is the app's
 * own answer and fixes the real cause: `height:100dvh; overflow:hidden`, so
 * with border-box the reservation lives INSIDE the viewport, and globals.css
 * explicitly gives a shell-locked body back the cookie-sheet height that a
 * merely `.screen-fit-locked` body never got. The lock is ref-counted, so an
 * overlapping mount/unmount during a route change never unlocks the page for a
 * frame.
 *
 * Deliberately a component and not a hook call inside the card: these routes
 * are server components, the card is already near its size ceiling, and the
 * lock belongs to the ROUTE (it must hold while the card is still loading).
 */
'use client';

import { useEducationShellLock } from '@/components/education/shell/useEducationShellLock';
import { useMissGapNavLock } from './useMissGapNavLock';

export interface MissGapShellLockProps {
  /**
   * Take the global bottom nav down for the whole route.
   *
   * The student surface is a game reached from a share link, and the design
   * rule for game surfaces is chrome-free — no tabs, no sidebar. It is also a
   * contrast fix: the nav's QUESTS / FRIENDS / HOME buttons render borderless
   * on navy (`edgeRatio 0`) and were three of the four flagged controls on
   * this screen. Hiding the nav also drops `has-global-bottom-nav` off
   * `<html>`, which removes its padding reservation rather than merely
   * suppressing the scroll it caused.
   *
   * Off by default: the teacher's compose card is a dashboard tool and keeps
   * the chrome it arrived with.
   */
  chromeFree?: boolean;
}

export function MissGapShellLock({ chromeFree }: MissGapShellLockProps = {}): null {
  useEducationShellLock();

  // Both locks are ref-counted and independent of one another, so an
  // overlapping mount/unmount during a route change never flashes the chrome
  // back for a frame. Degrades to a no-op with no NavigationProvider, which a
  // cold share link may well not have.
  //
  // `useMissGapNavLock`, not a bare `setIsInGame` pair: `MissGapGame` claims
  // the same nav while the student plays, and an unconditional `false` in ITS
  // cleanup used to hand the nav — and `--bottom-stack-height` of body padding
  // — back to the pre-start screen the moment the student tapped X, while this
  // route lock was still mounted. See useMissGapNavLock.ts.
  useMissGapNavLock(Boolean(chromeFree));

  return null;
}
