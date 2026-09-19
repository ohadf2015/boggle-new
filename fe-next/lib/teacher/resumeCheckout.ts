/**
 * Resume checkout after authentication.
 *
 * A guest who hits the 401 checkout wall proves intent to buy before the wall ever
 * shows up — they already clicked "Upgrade Now". Losing that click to a second manual
 * click after they finish signing in is the wall this flag removes: it survives a full
 * page reload (localStorage, not React state) so it also covers a magic-link or
 * email-confirmation click, which authenticates in a fresh navigation, not inside the
 * modal. Timestamped and capped at 15 minutes so a teacher who abandons the auth flow
 * and logs in hours/days later for an unrelated reason never gets an unsolicited
 * redirect to Polar checkout the next time they happen to land on this page.
 */

const RESUME_CHECKOUT_KEY = 'lc_resume_checkout_after_auth';
const RESUME_CHECKOUT_TTL_MS = 15 * 60 * 1000;

export function markResumeCheckoutIntent(): void {
  try {
    localStorage.setItem(RESUME_CHECKOUT_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (private mode, etc.) — the teacher just clicks twice.
  }
}

export function clearResumeCheckoutIntent(): void {
  try {
    localStorage.removeItem(RESUME_CHECKOUT_KEY);
  } catch {
    // no-op
  }
}

export function consumeResumeCheckoutIntent(): boolean {
  try {
    const raw = localStorage.getItem(RESUME_CHECKOUT_KEY);
    if (!raw) return false;
    localStorage.removeItem(RESUME_CHECKOUT_KEY);
    const setAt = Number(raw);
    return Number.isFinite(setAt) && Date.now() - setAt < RESUME_CHECKOUT_TTL_MS;
  } catch {
    return false;
  }
}
