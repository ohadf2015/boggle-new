/**
 * The three paths that ARE the join screen.
 *
 * `/join` is the address a teacher reads out, `/join/<code>` is where the
 * projector's QR lands, `/student/join` is the in-app door. All three render
 * one `JoinFlow`, so anything that asks "is a student mid-join right now"
 * must answer identically for all three — the tab bar, the cookie sheet, an
 * install prompt. Re-typing the list per caller is how two routes to one
 * outcome drift apart (recurring pitfall class 3), so it lives here once.
 *
 * Matching is on path SEGMENTS. `startsWith('/join')` also claims `/joinery`
 * and any future route whose name begins with those letters, and silently
 * strips its chrome.
 */

/** `/en/join`, `/he/join/AB3K9Z`, `/student/join`, `/join` — and nothing else. */
export function isStudentJoinPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  const at = segments.indexOf('join');
  if (at === -1) return false;
  // Position 0 (`/join`) or 1 (`/<locale>/join`). The locale segment is not
  // validated on purpose: a path is either shaped like the join route or it is
  // not, and a new locale must not quietly re-arm the cookie sheet here.
  if (at <= 1) return true;
  // `/student/join` and `/<locale>/student/join`.
  return at <= 2 && segments[at - 1] === 'student';
}

export default isStudentJoinPath;
