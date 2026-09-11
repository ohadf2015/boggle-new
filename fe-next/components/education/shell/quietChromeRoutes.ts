/**
 * Where the app's floating install/notification chrome must stand down.
 *
 * Two kinds of surface, one symptom. A teacher's screens are sized to the
 * viewport on purpose — a prompt docked at `fixed bottom-4` eats the bottom of
 * a layout that has nowhere left to scroll. And anything on a projector is in
 * front of thirty students: `PWAInstallPrompt` (`z-[100]`) and
 * `PushNotificationPrompt` (`z-50`) both stack over `TeacherLiveControls`
 * (`fixed inset-x-0 bottom-0 z-[70]`), which is where START GAME lives — the
 * "Get the App / Stay in the Game!" prompts covering the host's own button.
 *
 * Only the four install/push widgets are silenced here. `CookieConsent` still
 * mounts (consent is not a thing to skip); it re-ranks itself below the live
 * controls instead — see `components/CookieConsent.tsx`.
 *
 * Matching is on whole path SEGMENTS, like `isStudentJoinPath`. A
 * `startsWith('/teacher')` would also claim `/teacher-appreciation` and strip
 * its chrome for ever, silently.
 *
 * `/multiplayer` is listed by path rather than by `?classroom=true`: the query
 * string is not in `usePathname()`, and the surface is a full-screen game for a
 * public room too. `isInGameSurface()` cannot stand in for this — the
 * pre-start lobby, which is exactly where START GAME is, never sets it.
 */

/** Route heads, matched from the first segment after an optional locale. */
const QUIET_ROUTES: readonly (readonly string[])[] = [
  ['teacher'],
  ['student'],
  ['multiplayer'],
  ['education', 'classroom-game'],
];

export function isQuietChromeSurface(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  // A locale prefix is optional and never validated: adding a seventh language
  // must not quietly re-arm an install prompt over a live board.
  const candidates = [segments, segments.slice(1)];

  return QUIET_ROUTES.some((route) =>
    candidates.some((tail) => route.every((segment, i) => tail[i] === segment)),
  );
}

export default isQuietChromeSurface;
