/**
 * The ONE returning-visitor predicate for the homepage.
 *
 * It runs in two places that must never disagree:
 *  1. The pre-paint inline script (HOME_TREE_SCRIPT) that sets
 *     `html[data-home=returning|fresh]` before the first paint, so CSS shows the
 *     right homepage tree with no flash and no layout shift.
 *  2. At runtime via `hasCompletedOnboarding() || hasSupabaseSession()`
 *     (utils/onboardingStorage.ts → isReturningVisitor), which PageClient and
 *     LandingView use after hydration.
 *
 * `readReturningSignals` is serialized with Function#toString into the inline
 * script, so it must stay SELF-CONTAINED: no imports, no module constants, no
 * helpers, no syntax a compiler would lower into a helper call (spread,
 * for-of, optional chaining). Everything it needs arrives as an argument.
 * Parity is pinned by components/landing/__tests__/fresh.shell.homeTree.test.tsx.
 */

export const ONBOARDING_FLAG_KEY = 'lexiclash_onboarding_completed';
/** Flag values that mean "has been through onboarding" (completed or skipped). */
export const ONBOARDING_FLAG_VALUES: readonly string[] = ['true', 'skipped'];

export function readReturningSignals(
  storage: Pick<Storage, 'getItem' | 'key' | 'length'> | null,
  cookie: string,
  flagKey: string,
  flagValues: readonly string[],
  sessionOnly: boolean
): boolean {
  // A *live* session only: supabase-js leaves the literal "null" or an object
  // without access_token after signOut, which must not count.
  const looksLive = function (raw: string | null): boolean {
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return !!(parsed && typeof parsed === 'object' && parsed.access_token);
    } catch (err) {
      return false;
    }
  };
  const isAuthKey = function (name: string): boolean {
    return name.indexOf('sb-') === 0 && name.slice(-11) === '-auth-token';
  };

  if (storage) {
    if (!sessionOnly && flagValues.indexOf(String(storage.getItem(flagKey))) !== -1) return true;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && isAuthKey(key) && looksLive(storage.getItem(key))) return true;
    }
  }

  // @supabase/ssr keeps the session in a cookie rather than localStorage, as
  // `base64-<base64url(JSON)>`, split into `<name>.0`, `<name>.1`... when long.
  if (cookie) {
    const whole: Record<string, string> = {};
    const chunks: Record<string, string[]> = {};
    const parts = cookie.split(';');
    for (let j = 0; j < parts.length; j++) {
      const eq = parts[j].indexOf('=');
      if (eq < 0) continue;
      const name = parts[j].slice(0, eq).trim();
      const value = parts[j].slice(eq + 1).trim();
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const idx = dot > 0 ? name.slice(dot + 1) : '';
      if (isAuthKey(name)) whole[name] = value;
      else if (isAuthKey(base) && /^\d+$/.test(idx)) {
        if (!chunks[base]) chunks[base] = [];
        chunks[base][Number(idx)] = value;
      }
    }
    for (const base in chunks) {
      if (!whole[base]) whole[base] = chunks[base].join('');
    }
    for (const key in whole) {
      try {
        let raw = decodeURIComponent(whole[key]);
        if (raw.indexOf('base64-') === 0) {
          const b = raw.slice(7).replace(/-/g, '+').replace(/_/g, '/');
          raw = atob(b + '===='.slice(0, (4 - (b.length % 4)) % 4));
        }
        if (looksLive(raw)) return true;
      } catch (err) {
        // malformed cookie value
      }
    }
  }
  return false;
}

/**
 * Inline <script> body. Sets `data-home` on <html> synchronously while the
 * parser is still above the homepage trees. Any failure (storage blocked,
 * old browser) leaves the attribute unset, which CSS treats as fresh: the
 * crawler/server default.
 */
export const HOME_TREE_SCRIPT =
  '(function(){try{var r=(' +
  readReturningSignals.toString() +
  ')(window.localStorage,document.cookie,' +
  JSON.stringify(ONBOARDING_FLAG_KEY) +
  ',' +
  JSON.stringify(ONBOARDING_FLAG_VALUES) +
  ',false);document.documentElement.setAttribute("data-home",r?"returning":"fresh")}catch(e){}})();';
