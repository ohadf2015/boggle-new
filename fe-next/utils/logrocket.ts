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

type Traits = Record<string, string | number | boolean>;

function getLR(): LogRocketInstance | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { LogRocket?: LogRocketInstance }).LogRocket ?? null;
}

function setStr(traits: Traits, key: string, value: string | null | undefined): void {
  if (value !== undefined && value !== null && value !== '') traits[key] = value;
}

function setNum(traits: Traits, key: string, value: number | null | undefined): void {
  if (value !== undefined && value !== null && Number.isFinite(value)) traits[key] = value;
}

function setBool(traits: Traits, key: string, value: boolean | undefined): void {
  if (value !== undefined) traits[key] = value;
}

export interface IdentifyUserOpts {
  userId: string;
  // Identity
  displayName?: string;
  username?: string;
  email?: string;
  // Locale / role / context
  language?: string;
  userRole?: string;
  timezone?: string;
  country?: string;
  platform?: string;
  appVersion?: string;
  playerStyle?: string;
  birthYear?: number;
  // Flags
  isGuest?: boolean;
  isAdmin?: boolean;
  isTeacher?: boolean;
  isBetaTester?: boolean;
  hasCustomizedProfile?: boolean;
  avatarCustomized?: boolean;
  blastAccess?: boolean;
  practiceGraduated?: boolean;
  // Progression
  level?: number;
  prestigeLevel?: number;
  prestigeMultiplier?: number;
  totalGames?: number;
  totalScore?: number;
  totalWords?: number;
  totalXp?: number;
  lifetimeXp?: number;
  longestWordLength?: number;
  streakDays?: number;
  totalTimePlayed?: number;
  rankTier?: string;
  rankedMmr?: number;
  peakMmr?: number;
  rankedWins?: number;
  casualWins?: number;
  rankedGames?: number;
  casualGames?: number;
  // Economy
  coins?: number;
  lifetimeCoins?: number;
  // Acquisition
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  accountAgeDays?: number;
  // Experiment cohorts — already `exp_<key>`-prefixed by the caller.
  // Spread verbatim into traits so sessions are filterable by A/B bucket.
  experiments?: Record<string, string | number | boolean>;
}

/**
 * Identify the current user so LogRocket sessions are filterable
 * by name, email, role, level, locale, score totals, rank, etc.
 *
 * Safe to call before LogRocket loads — will no-op silently.
 * Call again when traits change (e.g., level up, name change).
 */
export function identifyUser(opts: IdentifyUserOpts): void {
  const lr = getLR();
  if (!lr) return;

  const traits: Traits = {};

  // Identity (displayName maps to LogRocket's `name` column)
  setStr(traits, 'name', opts.displayName);
  setStr(traits, 'username', opts.username);
  setStr(traits, 'email', opts.email);

  // Locale / role / context
  setStr(traits, 'language', opts.language);
  setStr(traits, 'userRole', opts.userRole);
  setStr(traits, 'timezone', opts.timezone);
  setStr(traits, 'country', opts.country);
  setStr(traits, 'platform', opts.platform);
  setStr(traits, 'appVersion', opts.appVersion);
  setStr(traits, 'playerStyle', opts.playerStyle);
  setNum(traits, 'birthYear', opts.birthYear);

  // Flags — `false` is meaningful (e.g. isGuest:false on authed sessions), keep it
  setBool(traits, 'isGuest', opts.isGuest);
  setBool(traits, 'isAdmin', opts.isAdmin);
  setBool(traits, 'isTeacher', opts.isTeacher);
  setBool(traits, 'isBetaTester', opts.isBetaTester);
  setBool(traits, 'hasCustomizedProfile', opts.hasCustomizedProfile);
  setBool(traits, 'avatarCustomized', opts.avatarCustomized);
  setBool(traits, 'blastAccess', opts.blastAccess);
  setBool(traits, 'practiceGraduated', opts.practiceGraduated);

  // Progression — zero is a real signal (new accounts), only drop undefined
  setNum(traits, 'level', opts.level);
  setNum(traits, 'prestigeLevel', opts.prestigeLevel);
  setNum(traits, 'prestigeMultiplier', opts.prestigeMultiplier);
  setNum(traits, 'totalGames', opts.totalGames);
  setNum(traits, 'totalScore', opts.totalScore);
  setNum(traits, 'totalWords', opts.totalWords);
  setNum(traits, 'totalXp', opts.totalXp);
  setNum(traits, 'lifetimeXp', opts.lifetimeXp);
  setNum(traits, 'longestWordLength', opts.longestWordLength);
  setNum(traits, 'streakDays', opts.streakDays);
  setNum(traits, 'totalTimePlayed', opts.totalTimePlayed);
  setStr(traits, 'rankTier', opts.rankTier);
  setNum(traits, 'rankedMmr', opts.rankedMmr);
  setNum(traits, 'peakMmr', opts.peakMmr);
  setNum(traits, 'rankedWins', opts.rankedWins);
  setNum(traits, 'casualWins', opts.casualWins);
  setNum(traits, 'rankedGames', opts.rankedGames);
  setNum(traits, 'casualGames', opts.casualGames);

  // Economy
  setNum(traits, 'coins', opts.coins);
  setNum(traits, 'lifetimeCoins', opts.lifetimeCoins);

  // Acquisition
  setStr(traits, 'utmSource', opts.utmSource);
  setStr(traits, 'utmMedium', opts.utmMedium);
  setStr(traits, 'utmCampaign', opts.utmCampaign);
  setStr(traits, 'referrer', opts.referrer);
  setNum(traits, 'accountAgeDays', opts.accountAgeDays);

  // Experiment cohorts — keys already namespaced; merge non-empty values
  if (opts.experiments) {
    for (const [k, v] of Object.entries(opts.experiments)) {
      if (v !== undefined && v !== null && v !== '') traits[k] = v;
    }
  }

  lr.identify(opts.userId, traits);
}

export interface IdentifyGuestTraits {
  name?: string;
  language?: string;
  platform?: string;
}

/**
 * Identify a guest player (pre-auth) by fingerprint + chosen name.
 * Lets you find their session in LogRocket even without a Supabase account.
 *
 * Back-compat: accepts a bare string `name` as the second arg.
 */
export function identifyGuest(
  fingerprint: string,
  nameOrTraits?: string | IdentifyGuestTraits
): void {
  const lr = getLR();
  if (!lr) return;

  const traits: Traits = { isGuest: true };

  if (typeof nameOrTraits === 'string') {
    setStr(traits, 'name', nameOrTraits);
  } else if (nameOrTraits) {
    setStr(traits, 'name', nameOrTraits.name);
    setStr(traits, 'language', nameOrTraits.language);
    setStr(traits, 'platform', nameOrTraits.platform);
  }

  lr.identify(`guest-${fingerprint}`, traits);
}

/**
 * Track a filterable custom event (game mode start, purchase, etc.).
 */
export function trackEvent(event: string, data?: Traits): void {
  const lr = getLR();
  if (!lr) return;
  lr.track(event, data);
}
