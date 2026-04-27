/**
 * Seasonal Rankings System
 *
 * Quarterly competitive seasons with soft ELO resets,
 * season-end rewards, and countdown timers.
 */

export interface Season {
  id: number;
  name: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  rewards: SeasonReward[];
}

export interface SeasonReward {
  tier: string;
  coins: number;
  badge: string;
  exclusive: boolean;
}

export interface SeasonRewardsResult {
  coins: number;
  badges: Array<{ id: string; name: string }>;
  exclusives: Array<{ type: string; id: string }>;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  totalMs: number;
}

const SEASON_THEMES = [
  'Word Warriors',
  'Letter Legends',
  'Vocab Victors',
  'Syllable Champions',
];

/** Season 1 starts Q1 2026 */
const SEASON_EPOCH = new Date('2026-01-01T00:00:00Z');
const MS_PER_DAY = 86_400_000;

/**
 * Get season ID and quarter boundaries for a given date.
 * Seasons are quarterly: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec).
 */
function getSeasonBounds(date: Date): { id: number; start: Date; end: Date } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed
  const quarter = Math.floor(month / 3);

  const epochYear = SEASON_EPOCH.getUTCFullYear();
  const epochQuarter = Math.floor(SEASON_EPOCH.getUTCMonth() / 3);

  const id = (year - epochYear) * 4 + (quarter - epochQuarter) + 1;

  const startMonth = quarter * 3;
  const endMonth = startMonth + 3;

  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = endMonth >= 12
    ? new Date(Date.UTC(year + 1, 0, 1))
    : new Date(Date.UTC(year, endMonth, 1));

  return { id, start, end };
}

/**
 * Get the currently active season.
 * @param now - optional date override (for testing)
 */
export function getCurrentSeason(now?: Date): Season {
  const date = now ?? new Date();
  const { id, start, end } = getSeasonBounds(date);
  const themeIndex = (id - 1) % SEASON_THEMES.length;
  const theme = SEASON_THEMES[themeIndex];

  return {
    id,
    name: `Season ${id}: ${theme}`,
    theme,
    startDate: start,
    endDate: end,
    rewards: buildSeasonRewards(id),
  };
}

/**
 * Get time remaining in the current season (monthly cadence after the
 * grandfathered Q1+April 2026 window).
 * @param now - optional date override
 */
export function getSeasonTimeRemaining(now?: Date): TimeRemaining {
  const date = now ?? new Date();
  const { end } = getMonthlySeasonBounds(date);
  const totalMs = Math.max(0, end.getTime() - date.getTime());
  const totalHours = totalMs / (1000 * 60 * 60);

  return {
    days: Math.floor(totalHours / 24),
    hours: Math.floor(totalHours % 24),
    totalMs,
  };
}

/**
 * Soft ELO reset: pulls everyone toward 1000.
 * Formula: elo * 0.75 + 250
 */
export function calculateSoftReset(elo: number): number {
  return Math.round(elo * 0.75 + 250);
}

/**
 * Get rewards for a given peak tier in a season.
 */
export function getSeasonRewards(tierName: string, seasonId: number): SeasonRewardsResult {
  const empty: SeasonRewardsResult = { coins: 0, badges: [], exclusives: [] };

  const tier = tierName.toLowerCase();

  if (tier === 'bronze') {
    return { coins: 100, badges: [], exclusives: [] };
  }

  if (tier === 'silver') {
    return {
      coins: 250,
      badges: [{ id: `silver-season-${seasonId}`, name: `Silver Season ${seasonId}` }],
      exclusives: [],
    };
  }

  if (tier === 'gold') {
    return {
      coins: 500,
      badges: [{ id: `gold-season-${seasonId}`, name: `Gold Season ${seasonId}` }],
      exclusives: [{ type: 'border', id: `gold-border-season-${seasonId}` }],
    };
  }

  if (tier === 'platinum') {
    return {
      coins: 1000,
      badges: [{ id: `platinum-season-${seasonId}`, name: `Platinum Season ${seasonId}` }],
      exclusives: [
        { type: 'border', id: `platinum-border-season-${seasonId}` },
        { type: 'tileSkin', id: `platinum-tile-season-${seasonId}` },
      ],
    };
  }

  // Diamond, Grandmaster, Master all get Diamond+ rewards
  if (['diamond', 'grandmaster', 'master'].includes(tier)) {
    return {
      coins: 2000,
      badges: [{ id: `${tier}-season-${seasonId}`, name: `${tierName} Season ${seasonId}` }],
      exclusives: [
        { type: 'border', id: `${tier}-border-season-${seasonId}` },
        { type: 'tileSkin', id: `${tier}-tile-season-${seasonId}` },
        { type: 'title', id: `${tier}-title-season-${seasonId}` },
      ],
    };
  }

  return empty;
}

/**
 * Grandfathered Season 1 window: 2026-01-01 → 2026-05-01.
 * After this point seasons become monthly. Exported so tests + migration share truth.
 */
export const GRANDFATHERED_SEASON_1_END = '2026-05-01T00:00:00.000Z';

const MONTHLY_EPOCH = new Date(GRANDFATHERED_SEASON_1_END);

/**
 * Monthly season bounds.
 * Season 1 covers Jan-Apr 2026 (grandfathered quarterly window).
 * Season 2+ are monthly: May 2026 = S2, Jun 2026 = S3, etc.
 */
export function getMonthlySeasonBounds(date: Date): { id: number; start: Date; end: Date } {
  if (date.getTime() < MONTHLY_EPOCH.getTime()) {
    return {
      id: 1,
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date(GRANDFATHERED_SEASON_1_END),
    };
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const monthsSinceEpoch =
    (year - MONTHLY_EPOCH.getUTCFullYear()) * 12 +
    (month - MONTHLY_EPOCH.getUTCMonth());

  const id = 2 + monthsSinceEpoch;

  const start = new Date(Date.UTC(year, month, 1));
  const end = month === 11
    ? new Date(Date.UTC(year + 1, 0, 1))
    : new Date(Date.UTC(year, month + 1, 1));

  return { id, start, end };
}

/**
 * Get the currently active season using the monthly-after-grandfathered cadence.
 * Prefer this over the legacy quarterly getCurrentSeason for any new code.
 */
export function getCurrentSeasonDynamic(now?: Date): Season {
  const date = now ?? new Date();
  const { id, start, end } = getMonthlySeasonBounds(date);
  const themeIndex = (id - 1) % SEASON_THEMES.length;
  const theme = SEASON_THEMES[themeIndex];

  return {
    id,
    name: `Season ${id}: ${theme}`,
    theme,
    startDate: start,
    endDate: end,
    rewards: buildSeasonRewards(id),
  };
}

function buildSeasonRewards(seasonId: number): SeasonReward[] {
  return [
    { tier: 'Bronze', coins: 100, badge: '', exclusive: false },
    { tier: 'Silver', coins: 250, badge: `silver-season-${seasonId}`, exclusive: false },
    { tier: 'Gold', coins: 500, badge: `gold-season-${seasonId}`, exclusive: true },
    { tier: 'Platinum', coins: 1000, badge: `platinum-season-${seasonId}`, exclusive: true },
    { tier: 'Diamond', coins: 2000, badge: `diamond-season-${seasonId}`, exclusive: true },
  ];
}
