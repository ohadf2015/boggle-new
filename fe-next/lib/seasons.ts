/**
 * Seasonal Rankings System
 *
 * Quarterly competitive seasons with soft ELO resets,
 * season-end rewards, and countdown timers.
 */

/**
 * A season's "twist" — the flavor + atmosphere that makes each month feel
 * distinct. Currently atmospheric (drives the banner badge + grid skin); the
 * `scoreMultiplier` hook is wired for future seasonal scoring events and is
 * kept >= 1 so a twist can never punish players.
 */
export interface SeasonTwist {
  key: string;
  emoji: string;
  title: string;
  blurb: string;
  scoreMultiplier: number;
}

export interface Season {
  id: number;
  name: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  rewards: SeasonReward[];
  imageUrl: string;
  accentColor: string;
  tagline: string;
  twist: SeasonTwist;
  /** CSS class applied to season-themed surfaces (board/banner) for "feeling". */
  gridSkinClass: string;
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

interface SeasonCatalogEntry {
  theme: string;
  tagline: string;
  accentColor: string;
  imageUrl: string;
  gridSkinClass: string;
  twist: SeasonTwist;
}

/**
 * The rotating identity catalog. Seasons cycle through these in order
 * ((id - 1) % length), so every month gets a distinct theme, accent, twist,
 * and grid skin — and the set repeats yearly. Entries 1-6 preserve the
 * original launched seasons (names/taglines/accents unchanged); 7-12 are new.
 */
const SEASON_CATALOG: SeasonCatalogEntry[] = [
  {
    theme: 'Word Warriors', tagline: 'Forge your legacy, one word at a time', accentColor: '#BFFF00',
    imageUrl: '/seasons/season-1-word-warriors.webp', gridSkinClass: 'season-skin-warrior',
    twist: { key: 'double-down', emoji: '⚔️', title: 'Double Down', blurb: 'Long words flex the hardest this season.', scoreMultiplier: 1 },
  },
  {
    theme: 'Letter Legends', tagline: 'Crowns earned, not inherited', accentColor: '#FF1493',
    imageUrl: '/seasons/season-2-letter-legends.webp', gridSkinClass: 'season-skin-legend',
    twist: { key: 'crown-rush', emoji: '👑', title: 'Crown Rush', blurb: 'Every letter is a weapon. Claim the throne.', scoreMultiplier: 1 },
  },
  {
    theme: 'Vocab Victors', tagline: 'Knowledge is your sharpest blade', accentColor: '#00FFFF',
    imageUrl: '/seasons/season-3-vocab-victors.webp', gridSkinClass: 'season-skin-vocab',
    twist: { key: 'rare-find', emoji: '💎', title: 'Rare Find', blurb: 'Dust off the rare words — this is their month.', scoreMultiplier: 1 },
  },
  {
    theme: 'Syllable Champions', tagline: 'Rhythm wins rounds', accentColor: '#8B5CF6',
    imageUrl: '/seasons/season-4-syllable-champions.webp', gridSkinClass: 'season-skin-syllable',
    twist: { key: 'combo-beat', emoji: '🥁', title: 'Combo Beat', blurb: 'Stack syllables, ride the combo, keep the tempo.', scoreMultiplier: 1 },
  },
  {
    theme: 'Phonic Phenoms', tagline: 'Sound is the new strategy', accentColor: '#FFE135',
    imageUrl: '/seasons/season-5-phonic-phenoms.webp', gridSkinClass: 'season-skin-phonic',
    twist: { key: 'sound-wave', emoji: '🎧', title: 'Sound Wave', blurb: 'Mix beats and letters into chart-topping plays.', scoreMultiplier: 1 },
  },
  {
    theme: 'Lexicon Lords', tagline: 'Rule the dictionary', accentColor: '#FF6B35',
    imageUrl: '/seasons/season-6-lexicon-lords.webp', gridSkinClass: 'season-skin-lexicon',
    twist: { key: 'throne-climb', emoji: '🏰', title: 'Throne Climb', blurb: 'Build your throne from every word you know.', scoreMultiplier: 1 },
  },
  {
    theme: 'Frost Lexicon', tagline: 'Cool letters, hot streaks', accentColor: '#7DD3FC',
    imageUrl: '/seasons/season-7-frost-lexicon.webp', gridSkinClass: 'season-skin-frost',
    twist: { key: 'frostbite', emoji: '❄️', title: 'Frostbite', blurb: 'Keep your streak warm while the board freezes over.', scoreMultiplier: 1 },
  },
  {
    theme: 'Neon Nights', tagline: 'The board comes alive after dark', accentColor: '#E040FB',
    imageUrl: '/seasons/season-8-neon-nights.webp', gridSkinClass: 'season-skin-neon',
    twist: { key: 'afterglow', emoji: '🌃', title: 'Afterglow', blurb: 'Neon trails follow every word you find.', scoreMultiplier: 1 },
  },
  {
    theme: 'Solar Surge', tagline: 'Burn bright, score brighter', accentColor: '#FF8A00',
    imageUrl: '/seasons/season-9-solar-surge.webp', gridSkinClass: 'season-skin-solar',
    twist: { key: 'heatwave', emoji: '☀️', title: 'Heatwave', blurb: 'The longer your run, the hotter the board glows.', scoreMultiplier: 1 },
  },
  {
    theme: 'Verdant Vault', tagline: 'Grow your lead, word by word', accentColor: '#34D399',
    imageUrl: '/seasons/season-10-verdant-vault.webp', gridSkinClass: 'season-skin-verdant',
    twist: { key: 'bloom', emoji: '🌿', title: 'Bloom', blurb: 'Every find plants the next. Watch your score blossom.', scoreMultiplier: 1 },
  },
  {
    theme: 'Cosmic Cipher', tagline: 'Decode the stars', accentColor: '#818CF8',
    imageUrl: '/seasons/season-11-cosmic-cipher.webp', gridSkinClass: 'season-skin-cosmic',
    twist: { key: 'stardust', emoji: '🪐', title: 'Stardust', blurb: 'Letters drift like constellations across the grid.', scoreMultiplier: 1 },
  },
  {
    theme: 'Crimson Crown', tagline: 'The final ascent', accentColor: '#FB7185',
    imageUrl: '/seasons/season-12-crimson-crown.webp', gridSkinClass: 'season-skin-crimson',
    twist: { key: 'final-bell', emoji: '🔔', title: 'Final Bell', blurb: 'The year closes — every point writes the record books.', scoreMultiplier: 1 },
  },
];

/** Number of distinct season identities before the catalog repeats. */
export const SEASON_CATALOG_SIZE = SEASON_CATALOG.length;

function catalogForSeason(id: number): SeasonCatalogEntry {
  // ids are 1-based; wrap so every future season still gets an identity.
  const index = ((id - 1) % SEASON_CATALOG_SIZE + SEASON_CATALOG_SIZE) % SEASON_CATALOG_SIZE;
  return SEASON_CATALOG[index];
}

/** The twist (flavor + atmosphere) for a given season id. */
export function getSeasonTwist(id: number): SeasonTwist {
  return catalogForSeason(id).twist;
}

/** The display theme name for a given season id (cycles the catalog). */
export function getSeasonTheme(id: number): string {
  return catalogForSeason(id).theme;
}

/** The accent color for a given season id (cycles the catalog). */
export function getSeasonAccent(id: number): string {
  return catalogForSeason(id).accentColor;
}

/** Season 1 starts Q1 2026 */
const SEASON_EPOCH = new Date('2026-01-01T00:00:00Z');

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
  return buildSeason(id, start, end);
}

/** Assemble a full Season object from its id + bounds via the identity catalog. */
function buildSeason(id: number, start: Date, end: Date): Season {
  const entry = catalogForSeason(id);
  return {
    id,
    name: `Season ${id}: ${entry.theme}`,
    theme: entry.theme,
    startDate: start,
    endDate: end,
    rewards: buildSeasonRewards(id),
    imageUrl: entry.imageUrl,
    accentColor: entry.accentColor,
    tagline: entry.tagline,
    twist: entry.twist,
    gridSkinClass: entry.gridSkinClass,
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
  return buildSeason(id, start, end);
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
