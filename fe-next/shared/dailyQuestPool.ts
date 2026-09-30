/**
 * Daily quest pool — deterministic daily rotation of IN-GAMEPLAY ACHIEVEMENT
 * quests (find a long word, climb the tower, solve connections), NOT mode grinds.
 * Most quests are completable from the Daily Challenge hub (/daily,
 * /word-tower/daily, /connections/daily); `getDailyQuests` guarantees at least
 * two such quests per day so a daily-only player can always progress.
 *
 * Each day picks 3 quests from the pool (slots 0/1/2) via a seeded shuffle so
 * frontend and backend always agree without storing config. Completion is
 * decided by `evaluateDailyQuests` against a finished-game result — any of the
 * 3 game-end seams (socket / word-hunt API / drills API) can complete any quest
 * it has the data for.
 *
 * DB columns word_hunt/adventure/community_completed remain SLOT containers
 * (0/1/2) — their names are legacy; they no longer imply a mode.
 *
 * Beta SOCKET modes (adventure, blast, wheel-rush, word-tower versus, sealed-bid,
 * crossword) are NEVER referenced here — quests only steer to public routes.
 * The DAILY Word Tower is public and reports through its own seam with the mode
 * label 'word-tower-daily' (distinct from the beta socket mode 'word-tower').
 */

export type QuestConditionType =
  | 'longWord' // longest word found this game >= target
  | 'score' // game score >= target
  | 'wordsInGame' // words found this game >= target
  | 'combo' // peak combo this game >= target
  | 'mpWin' // top human in a game with >=1 human opponent
  | 'beatHuman' // outscored at least one real human opponent
  | 'towerMetres' // metres climbed in today's daily Word Tower >= target
  | 'towerFloors' // floors built in today's daily Word Tower >= target
  | 'puzzlesSolved' // daily Connections puzzles solved >= target
  | 'playMode'; // played a specific public mode (discovery)

export type QuestFamily = 'skill' | 'pvp' | 'discovery';

/** Public mode labels a `playMode` quest may reference. NO beta modes. */
export const QUEST_PUBLIC_MODES = [
  'multiplayer',
  'brain',
  'word-hunt',
  'word-wheel',
  'word-tower-daily',
  'connections-daily',
] as const;
export type QuestPublicMode = (typeof QUEST_PUBLIC_MODES)[number];

/**
 * Beta / not-yet-public game modes. Their socket games route through the SAME
 * recording seam as classic multiplayer (recordGameResultsToSupabase), so a
 * high score in crossword/sealed-bid/etc would otherwise silently credit the
 * daily/weekly skill quests — even though the quest pool never steers players
 * there. `isQuestEligibleMode` gates that seam so beta play grants no quest
 * progress. Keep this list in sync with the header-comment enumeration above.
 *
 * 'word-tower' here is the beta SOCKET (versus) mode only. The public daily
 * tower posts to /api/word-tower/daily/score and reports as 'word-tower-daily'
 * straight to `completeDailyQuestsForResult`, which is not gated by this list.
 */
export const QUEST_BETA_MODES = [
  'adventure',
  'blast',
  'wheel-rush',
  'word-tower',
  'sealed-bid',
  'crossword',
] as const;

/**
 * Whether a finished game in this mode may credit quest progress (daily OR
 * weekly). Blocklist by design (fails OPEN): an unknown/newly-added mode credits
 * by default; only the known beta modes are excluded. This keeps quest
 * completion working the day a new public mode ships — the opposite (an
 * allowlist) would silently stop completion, the exact "quests don't complete"
 * bug we're fixing.
 */
export function isQuestEligibleMode(gameMode: string | undefined | null): boolean {
  if (!gameMode) return true;
  return !(QUEST_BETA_MODES as readonly string[]).includes(gameMode);
}

export interface DailyQuest {
  id: string;
  type: QuestConditionType;
  target: number;
  family: QuestFamily;
  titleKey: string;
  descKey: string;
  href: string;
  icon: string;
  /** For `playMode`: which public mode satisfies it. */
  mode?: QuestPublicMode;
}

/**
 * Normalized facts about a finished game. Each game-end seam fills what it
 * knows; unknown fields default to 0/false so a seam can only ever COMPLETE a
 * quest it has real data for (never a silent false-positive).
 */
export interface QuestGameResult {
  /** Seam's mode label, e.g. 'classic' | 'word-hunt' | 'brain'. */
  mode: string;
  isMultiplayer: boolean;
  score: number;
  longestWordLength: number;
  wordsFound: number;
  /** Peak combo level reached this game. */
  maxCombo: number;
  /** Metres climbed in today's daily Word Tower (whole metres). */
  towerMetres: number;
  /** Floors built in today's daily Word Tower. */
  towerFloors: number;
  /** Daily Connections puzzles solved. */
  puzzlesSolved: number;
  /** Number of OTHER human players in the game. */
  humanOpponentCount: number;
  /** This player is #1 among the humans. */
  isTopHuman: boolean;
  /** This player outscored at least one OTHER human. */
  beatHumanOpponent: boolean;
}

export function emptyQuestResult(
  partial: Partial<QuestGameResult> = {},
): QuestGameResult {
  return {
    mode: '',
    isMultiplayer: false,
    score: 0,
    longestWordLength: 0,
    wordsFound: 0,
    maxCombo: 0,
    towerMetres: 0,
    towerFloors: 0,
    puzzlesSolved: 0,
    humanOpponentCount: 0,
    isTopHuman: false,
    beatHumanOpponent: false,
    ...partial,
  };
}

// translations live under quests.daily.<id>.{title,desc}
const q = (
  id: string,
  type: QuestConditionType,
  target: number,
  family: QuestFamily,
  href: string,
  icon: string,
  mode?: QuestPublicMode,
): DailyQuest => ({
  id,
  type,
  target,
  family,
  href,
  icon,
  titleKey: `quests.daily.${id}.title`,
  descKey: `quests.daily.${id}.desc`,
  ...(mode ? { mode } : {}),
});


/**
 * Quest facts for a finished daily Word Wheel run.
 *
 * The wheel route credited the WEEKLY `dailyChallengesCompleted` counter but
 * never called the daily-quest seam, so completing it moved no daily mission.
 * Kept pure and separate from the route so it is testable without Supabase.
 *
 * A daily run is always solo: no human opponents, so it can never satisfy the
 * PvP conditions no matter how high the score.
 */
export function questResultForWordWheel(run: {
  score?: number | null;
  wordsFound?: readonly string[] | null;
}): QuestGameResult {
  const words = Array.isArray(run.wordsFound) ? run.wordsFound : [];
  return emptyQuestResult({
    mode: 'word-wheel',
    score: run.score ?? 0,
    wordsFound: words.length,
    longestWordLength: words.reduce((m, w) => Math.max(m, w?.length ?? 0), 0),
  });
}

const wholeNonNegative = (n: unknown): number => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/**
 * Quest facts for a daily Word Tower climb. `heightM` is the DELTA climbed today
 * (the daily score route stores best climb today, not tower height), so it is a
 * fair per-day target. Solo, never PvP. Pure, testable without Supabase.
 */
export function questResultForWordTower(run: {
  heightM?: number | null;
  floors?: number | null;
}): QuestGameResult {
  return emptyQuestResult({
    mode: 'word-tower-daily',
    towerMetres: wholeNonNegative(run.heightM),
    towerFloors: wholeNonNegative(run.floors),
  });
}

/** Quest facts for a submitted daily Connections (Word Bridge) result. */
export function questResultForConnections(run: {
  puzzlesSolved?: number | null;
}): QuestGameResult {
  return emptyQuestResult({
    mode: 'connections-daily',
    puzzlesSolved: wholeNonNegative(run.puzzlesSolved),
  });
}

/** Routes from the Daily Challenge hub that can credit quests. */
export const DAILY_QUEST_HREFS = ['/daily', '/word-tower/daily', '/connections/daily'] as const;

/** True when the quest can be finished inside the Daily Challenge modes. */
export function isDailyCompletable(quest: DailyQuest): boolean {
  return (DAILY_QUEST_HREFS as readonly string[]).includes(quest.href);
}

export const DAILY_QUEST_POOL: DailyQuest[] = [
  // DAILY-COMPLETABLE (href on the Daily Challenge routes). Each seam reports:
  //   word hunt / word wheel -> longest word + word count (+ score for wheel)
  //   word tower daily       -> metres climbed today + floors built
  //   connections daily      -> puzzles solved
  // Longest-word target capped at 6: a 7+ letter word was too hard for casuals.
  q('long_word_6', 'longWord', 6, 'skill', '/daily', '📏'),
  // Verified against 1,115 real Word Wheel runs: median run finds 16 words,
  // 55.9% clear 15, and 27.4% land a 6-letter word.
  q('words_15', 'wordsInGame', 15, 'skill', '/daily', '⚡'),
  // Word Tower daily: first word ~2m, strong days 400m+, so 25m / 8 floors are
  // a short session for anyone who opens the tower.
  q('tower_climb_25', 'towerMetres', 25, 'skill', '/word-tower/daily', '🏗️'),
  q('tower_floors_8', 'towerFloors', 8, 'skill', '/word-tower/daily', '🧱'),
  // Connections daily has 5 puzzles; solving 3 is a clear but reachable bar.
  q('connections_solve_3', 'puzzlesSolved', 3, 'skill', '/connections/daily', '🧩'),
  // Discovery — the daily games are public. Only one playMode quest is served
  // per day (one quest per condition type), so these never stack.
  q('play_wordhunt', 'playMode', 1, 'discovery', '/daily', '🔎', 'word-hunt'),
  q('play_wordwheel', 'playMode', 1, 'discovery', '/daily', '🎡', 'word-wheel'),
  q('play_tower_daily', 'playMode', 1, 'discovery', '/word-tower/daily', '🗼', 'word-tower-daily'),
  q('play_connections_daily', 'playMode', 1, 'discovery', '/connections/daily', '🔗', 'connections-daily'),

  // CLASSIC SOCKET PATH (/multiplayer): the only game-end that credits score and
  // combo. Not reported by any daily seam, so they stay off the daily routes;
  // the picker guarantees these can never crowd out the daily-completable ones.
  q('score_300', 'score', 300, 'skill', '/multiplayer', '🎯'),
  q('score_500', 'score', 500, 'skill', '/multiplayer', '🚀'),
  q('combo_4', 'combo', 4, 'skill', '/multiplayer', '🔥'),
  q('combo_6', 'combo', 6, 'skill', '/multiplayer', '💥'),
  q('play_mp', 'playMode', 1, 'discovery', '/multiplayer', '🎮', 'multiplayer'),
  q('play_brain', 'playMode', 1, 'discovery', '/brain', '🧠', 'brain'),
  // PVP — at most one per day (soloable Grand Slam)
  q('mp_win', 'mpWin', 1, 'pvp', '/multiplayer', '👑'),
  q('beat_human', 'beatHuman', 1, 'pvp', '/multiplayer', '⚔️'),
];

// LCG shuffle with Murmur3 finalizer to diffuse consecutive integer seeds.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  s ^= s >>> 16;
  s = Math.imul(s, 0x85ebca6b) >>> 0;
  s ^= s >>> 13;
  s = Math.imul(s, 0xc2b2ae35) >>> 0;
  s ^= s >>> 16;
  if (s === 0) s = 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function seedFor(dateStr?: string): number {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
}

/**
 * Today's 3 quests in slot order (0,1,2). Deterministic per date.
 * Rules: no two quests of the same condition type; at most one PvP quest (so a
 * solo player can still complete all 3 / Grand Slam); and at least
 * MIN_DAILY_COMPLETABLE quests completable from the Daily Challenge routes.
 */
export const MIN_DAILY_COMPLETABLE = 2;

export function getDailyQuests(
  dateStr?: string,
): [DailyQuest, DailyQuest, DailyQuest] {
  const shuffled = seededShuffle(DAILY_QUEST_POOL, seedFor(dateStr));
  const picked: DailyQuest[] = [];
  const usedTypes = new Set<QuestConditionType>();
  let pvpCount = 0;

  const tryPick = (quest: DailyQuest): boolean => {
    if (picked.length === 3 || picked.includes(quest)) return false;
    if (usedTypes.has(quest.type)) return false;
    if (quest.family === 'pvp' && pvpCount >= 1) return false;
    picked.push(quest);
    usedTypes.add(quest.type);
    if (quest.family === 'pvp') pvpCount++;
    return true;
  };

  // Pass 1: reserve the guaranteed daily-completable quests first.
  let dailyCount = 0;
  for (const quest of shuffled) {
    if (dailyCount >= MIN_DAILY_COMPLETABLE) break;
    if (isDailyCompletable(quest) && tryPick(quest)) dailyCount++;
  }
  // Pass 2: fill the remaining slot(s) from the whole shuffled pool.
  for (const quest of shuffled) tryPick(quest);
  // Relaxation pass (should never be needed with the current pool size, but
  // guarantees exactly 3 rather than a silent short array — Class 4).
  for (const quest of shuffled) {
    if (picked.length === 3) break;
    if (!picked.includes(quest)) picked.push(quest);
  }

  // Keep slot order stable w.r.t. the seeded shuffle (not the reservation order).
  picked.sort((a, b) => shuffled.indexOf(a) - shuffled.indexOf(b));
  return [picked[0], picked[1], picked[2]];
}

function isSatisfied(quest: DailyQuest, r: QuestGameResult): boolean {
  switch (quest.type) {
    case 'longWord':
      return r.longestWordLength >= quest.target;
    case 'score':
      return r.score >= quest.target;
    case 'wordsInGame':
      return r.wordsFound >= quest.target;
    case 'combo':
      return r.maxCombo >= quest.target;
    case 'mpWin':
      return r.isMultiplayer && r.isTopHuman && r.humanOpponentCount >= 1;
    case 'beatHuman':
      return r.beatHumanOpponent;
    case 'towerMetres':
      return r.towerMetres >= quest.target;
    case 'towerFloors':
      return r.towerFloors >= quest.target;
    case 'puzzlesSolved':
      return r.puzzlesSolved >= quest.target;
    case 'playMode':
      if (quest.mode === 'multiplayer') return r.isMultiplayer;
      return r.mode === quest.mode;
    default:
      return false;
  }
}

/**
 * Given today's quests (slot order) and a finished-game result, return the slot
 * indices whose quest condition this result satisfies. Pure & seam-agnostic.
 */
export function evaluateDailyQuests(
  quests: DailyQuest[],
  result: QuestGameResult,
): number[] {
  const out: number[] = [];
  quests.forEach((quest, i) => {
    if (isSatisfied(quest, result)) out.push(i);
  });
  return out;
}
