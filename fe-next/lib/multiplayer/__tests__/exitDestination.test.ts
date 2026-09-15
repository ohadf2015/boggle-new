import { describe, it, expect } from 'vitest';
import { multiplayerExitDestination } from '../exitDestination';
import { classroomStudentHomePath } from '@/lib/education/classroomRoomGone';

/**
 * The asymmetry this pins (pitfalls class 3).
 *
 * Entry into a classroom game CARRIES education context:
 *   /en/teacher --GO LIVE--> /en/multiplayer?room=X&classroom=true&host=true
 * Exit DISCARDED it. `handleExitToLobby` stripped `room|classroom|host` via
 * `stripMultiplayerExitParams` and then just... stood there, on `/multiplayer`
 * — which without those params is the CONSUMER arcade lobby. Measured live
 * 2026-09-15: a teacher tapped Back in a classroom lobby, confirmed, and landed
 * on `/en/multiplayer` titled "Free Multiplayer Word Game — 2-20 Players, 8
 * Modes, No Signup", education shell gone, consumer chrome (Quick Play / Daily /
 * Ranks / Arena Hub) in its place, with "Home" one tap from `/en`.
 *
 * Stripping the params is NOT the bug and must not be reverted — it closes the
 * audit `multiplayer-ux-2026-05-04 #5` trap where a reload re-entered the lobby
 * the user was trying to leave. The bug is that nothing then CHOSE a
 * destination. This module is that choice, kept pure so it can be tested away
 * from PageClient (a ~830-line provider-wrapped shell no unit test can render).
 *
 * The invariant, and the reason this file exists rather than three assertions
 * inside a route test: a classroom exit must never resolve to a consumer
 * surface. Add a fourth entry path later and this still fails if you drop the
 * context on the way out.
 */
describe('multiplayerExitDestination — a classroom exit never lands on a consumer surface', () => {
  it('sends a classroom host back to the teacher surface, not the arcade', () => {
    expect(multiplayerExitDestination({ isClassroomMode: true, isHost: true, locale: 'en' }))
      .toBe('/en/teacher');
  });

  it('sends a classroom student to the student hub, not the arcade', () => {
    expect(multiplayerExitDestination({ isClassroomMode: true, isHost: false, locale: 'en' }))
      .toBe(classroomStudentHomePath('en'));
  });

  it('keeps the locale rather than dropping a Hebrew teacher onto an English route', () => {
    expect(multiplayerExitDestination({ isClassroomMode: true, isHost: true, locale: 'he' }))
      .toBe('/he/teacher');
    expect(multiplayerExitDestination({ isClassroomMode: true, isHost: false, locale: 'he' }))
      .toBe('/he/student');
  });

  it('falls back to en when the locale is missing', () => {
    expect(multiplayerExitDestination({ isClassroomMode: true, isHost: true, locale: '' }))
      .toBe('/en/teacher');
  });

  /**
   * The consumer case is the one that must NOT change. For an ordinary arcade
   * game the multiplayer lobby genuinely is home, and the in-place reset is
   * deliberate: a hard navigation blanks the Capacitor static-export WebView.
   * `null` means "stay, reset in place" — the pre-existing behaviour.
   */
  it('returns null for an ordinary multiplayer game so the in-place reset is kept', () => {
    expect(multiplayerExitDestination({ isClassroomMode: false, isHost: true, locale: 'en' }))
      .toBeNull();
    expect(multiplayerExitDestination({ isClassroomMode: false, isHost: false, locale: 'en' }))
      .toBeNull();
  });

  /** No classroom destination may point back into the multiplayer surface. */
  it('never returns a /multiplayer path for any classroom role', () => {
    for (const isHost of [true, false]) {
      for (const locale of ['en', 'he', 'es', 'sv', 'ja']) {
        const dest = multiplayerExitDestination({ isClassroomMode: true, isHost, locale });
        expect(dest, `classroom isHost=${isHost} locale=${locale}`).not.toMatch(/multiplayer/);
        expect(dest).toMatch(new RegExp(`^/${locale}/`));
      }
    }
  });
});
