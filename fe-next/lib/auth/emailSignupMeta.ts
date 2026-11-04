/**
 * Metadata stashed on email signUp options.data (t_9eb9ad5f).
 *
 * The confirm link often opens in another browser, so localStorage first-touch
 * and the sessionStorage surface latch are gone. These keys travel on
 * auth.users.raw_user_meta_data: handle_new_user() stamps them at insert, and
 * the first authenticated session fills any column the trigger missed.
 *
 * Nulls are dropped — an absent key is cleaner than an empty string.
 */

export const SUPPORTED_SIGNUP_LANGUAGES = ['he', 'en', 'sv', 'ja', 'es', 'ru'] as const;

/** Must match growthTracking SIGNUP_SOURCE_PENDING_KEY. Duplicated so the
 *  signup path does not import the 2k-line analytics module. */
const SIGNUP_SOURCE_PENDING_KEY = 'lexiclash_signup_source_pending';
const SIGNUP_FUNNEL_PENDING_KEY = 'lexiclash_signup_funnel_pending';

const SURFACE_RE = /^[a-z0-9_]{1,100}$/;

export interface EmailSignupTouch {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer_domain?: string | null;
  landing_path?: string | null;
}

export interface EmailSignupMetaInput {
  firstTouch?: EmailSignupTouch | null;
  signupSurface?: string | null;
  language?: string | null;
  countryCode?: string | null;
  /** Only 'teacher' is honoured. Anything else is dropped so a crafted
   *  payload cannot mint admin. */
  intendedRole?: 'teacher' | 'student' | null;
}

export function normalizeLanguage(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toLowerCase().split('-')[0];
  return (SUPPORTED_SIGNUP_LANGUAGES as readonly string[]).includes(code) ? code : null;
}

export function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null;
  return code;
}

export function normalizeSurface(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return SURFACE_RE.test(trimmed) ? trimmed : null;
}

function clip(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Always includes signup_surface (defaults to header_or_menu) so an email
 * signup is never an unattributed row when the trigger is applied.
 */
export function buildEmailSignupMetadata(input: EmailSignupMetaInput): Record<string, string> {
  const ft = input.firstTouch;
  const surface = normalizeSurface(input.signupSurface) ?? 'header_or_menu';
  const role = input.intendedRole === 'teacher' ? 'teacher' : null;
  const raw: Record<string, string | null> = {
    utm_source: clip(ft?.utm_source, 200),
    utm_medium: clip(ft?.utm_medium, 200),
    utm_campaign: clip(ft?.utm_campaign, 200),
    referrer_domain: clip(ft?.referrer_domain, 200),
    landing_path: clip(ft?.landing_path, 500),
    signup_surface: surface,
    language: normalizeLanguage(input.language),
    country_code: normalizeCountry(input.countryCode),
    intended_role: role,
  };
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0),
  );
}

/** Latched surface, without consuming it — AuthProvider still owns the consume. */
export function peekClientSignupSurface(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const latched = normalizeSurface(sessionStorage.getItem(SIGNUP_SOURCE_PENDING_KEY));
    if (latched) return latched;
    const pending = sessionStorage.getItem(SIGNUP_FUNNEL_PENDING_KEY);
    if (pending === 'first_win') return 'first_win_prompt';
    if (pending === 'multi_game') return 'multi_game_prompt';
  } catch {
    /* private mode */
  }
  return null;
}

export function readStoredSignupLanguage(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie
      .split(';')
      .map((c) => c.trim().split('='))
      .find(([name]) => name === 'boggle_language');
    const fromCookie = normalizeLanguage(match?.[1] ? decodeURIComponent(match[1]) : null);
    if (fromCookie) return fromCookie;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      return normalizeLanguage(localStorage.getItem('boggle_language'));
    } catch {
      /* ignore */
    }
  }
  return null;
}
