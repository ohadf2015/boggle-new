/**
 * Client-side fire-and-forget trigger for the new-signup welcome email.
 *
 * Called from the central auth `onAuthStateChange('SIGNED_IN')` so it covers
 * EVERY signup method (OAuth, email/password, magic-link, OTP) — not just the
 * ones that pass through /auth/callback.
 *
 * Safety lives on the server (lib/welcomeEmail.ts): an atomic claim makes the
 * send idempotent and NEW-signups-only, so calling this on any SIGNED_IN — even
 * a returning user's login — never double-sends or mails existing users. The
 * per-session guard here is just to avoid hammering the endpoint on token
 * refreshes / cross-tab SIGNED_IN echoes.
 *
 * Language: we pass the CURRENT UI locale (the strongest signal of what language
 * the player actually wants), which the server prefers over geo-IP country.
 */

const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const SESSION_GUARD_KEY = 'lc_welcome_email_tried';

let firedThisPageLoad = false;

function currentUiLocale(): string {
  if (typeof window === 'undefined') return 'en';
  const seg = window.location.pathname.split('/')[1];
  return (SUPPORTED_LOCALES as readonly string[]).includes(seg) ? seg : 'en';
}

export async function triggerWelcomeEmail(accessToken?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (firedThisPageLoad) return;
  firedThisPageLoad = true;

  try {
    if (window.sessionStorage.getItem(SESSION_GUARD_KEY)) return;
    window.sessionStorage.setItem(SESSION_GUARD_KEY, '1');
  } catch {
    // sessionStorage may be unavailable (private mode); server is still idempotent.
  }

  try {
    await fetch('/api/email/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ locale: currentUiLocale() }),
      keepalive: true,
    });
  } catch {
    // Best-effort. The server is the source of truth and idempotent; a missed
    // call here just means the next SIGNED_IN (next session) retries.
  }
}
