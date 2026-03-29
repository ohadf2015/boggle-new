/**
 * LogRocket utilities — identity, traits, and session filtering helpers.
 *
 * LogRocket is lazy-loaded in essential-providers.tsx; these helpers
 * safely access it via the global `window.LogRocket` reference.
 */

interface LogRocketInstance {
  identify: (uid: string, traits?: Record<string, string | number | boolean>) => void;
  track: (event: string, data?: Record<string, string | number | boolean>) => void;
  getSessionURL: (cb: (url: string) => void) => void;
  sessionURL?: string;
}

function getLR(): LogRocketInstance | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { LogRocket?: LogRocketInstance }).LogRocket ?? null;
}

/**
 * Identify the current user so LogRocket sessions are filterable
 * by name, email, role, level, etc.
 *
 * Safe to call before LogRocket loads — will no-op silently.
 * Call again when traits change (e.g., level up, name change).
 */
export function identifyUser(opts: {
  userId: string;
  displayName?: string;
  email?: string;
  isGuest?: boolean;
  isAdmin?: boolean;
  isTeacher?: boolean;
  level?: number;
  totalGames?: number;
  country?: string;
  utmSource?: string;
  prestigeLevel?: number;
}): void {
  const lr = getLR();
  if (!lr) return;

  const traits: Record<string, string | number | boolean> = {};

  if (opts.displayName) traits.name = opts.displayName;
  if (opts.email) traits.email = opts.email;
  if (opts.isGuest !== undefined) traits.isGuest = opts.isGuest;
  if (opts.isAdmin) traits.isAdmin = true;
  if (opts.isTeacher) traits.isTeacher = true;
  if (opts.level !== undefined) traits.level = opts.level;
  if (opts.totalGames !== undefined) traits.totalGames = opts.totalGames;
  if (opts.country) traits.country = opts.country;
  if (opts.utmSource) traits.utmSource = opts.utmSource;
  if (opts.prestigeLevel !== undefined) traits.prestigeLevel = opts.prestigeLevel;

  lr.identify(opts.userId, traits);
}

/**
 * Identify a guest player (pre-auth) by fingerprint + chosen name.
 * Lets you find their session in LogRocket even without a Supabase account.
 */
export function identifyGuest(fingerprint: string, name?: string): void {
  const lr = getLR();
  if (!lr) return;

  const traits: Record<string, string | number | boolean> = {
    isGuest: true,
  };
  if (name) traits.name = name;

  lr.identify(`guest-${fingerprint}`, traits);
}

/**
 * Track a filterable custom event (game mode start, purchase, etc.).
 */
export function trackEvent(event: string, data?: Record<string, string | number | boolean>): void {
  const lr = getLR();
  if (!lr) return;
  lr.track(event, data);
}
