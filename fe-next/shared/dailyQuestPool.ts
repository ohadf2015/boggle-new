/**
 * Daily quest pool — deterministic daily rotation of IN-GAMEPLAY ACHIEVEMENT
 * quests (find a long word, win vs a human, hit a score), NOT mode grinds.
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
 * Beta modes (adventure, blast, wheel-rush, word-tower, shiritori, sealed-bid,
 * crossword) are NEVER referenced here — quests only steer to public routes.
 */

export type QuestConditionType =
  | 'longWord' // longest word found this game >= target
  | 'score' // game score >= target
  | 'wordsInGame' // words found this game >= target
  | 'combo' // peak combo this game >= target
  | 'mpWin' // top human in a game with >=1 human opponent
  | 'beatHuman' // outscored at least one real human opponent
  | 'playMode'; // played a specific public mode (discovery)

export type QuestFamily = 'skill' | 'pvp' | 'discovery';

/** Public mode labels a `playMode` quest may reference. NO beta modes. */
export const QUEST_PUBLIC_MODES = ['multiplayer', 'brain', 'word-hunt'] as const;
export type QuestPublicMode = (typeof QUEST_PUBLIC_MODES)[number];

/**
 * Beta / not-yet-public game modes. Their socket games route through the SAME
 * recording seam as classic multiplayer (recordGameResultsToSupabase), so a
 * high score in crossword/sealed-bid/etc would otherwise silently credit the
 * daily/weekly skill quests — even though the quest pool never steers players
 * there. `isQuestEligibleMode` gates that seam so beta play grants no quest
 * progress. Keep this list in sync with the header-comment enumeration above.
 */
export const QUEST_BETA_MODES = [
  'adventure',
  'blast',
  'wheel-rush',
  'word-tower',
  'shiritori',
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

export const DAILY_QUEST_POOL: DailyQuest[] = [
  // SKILL — achieve something inside the gameplay. All steer to /multiplayer:
  // the classic socket seam (gameResults.ts) is the ONLY game-end that credits
  // every skill metric (score, longest word, words found, peak combo), and it
  // works solo-vs-bots (skill quests don't require a real opponent). Word Hunt
  // (/daily) emits no score/combo and can't guarantee a 7-letter target or 15
  // words; single-player never reaches a seam at all — so steering skill quests
  // there left them silently uncompletable.
  // Longest-word target capped at 6: a 7+ letter word was too hard for the
  // casual audience (many games' best word never hits 7). 6 stays achievable.
  q('long_word_6', 'longWord', 6, 'skill', '/multiplayer', '📏'),
  q('score_300', 'score', 300, 'skill', '/multiplayer', '🎯'),
  q('score_500', 'score', 500, 'skill', '/multiplayer', '🚀'),
  q('words_15', 'wordsInGame', 15, 'skill', '/multiplayer', '⚡'),
  q('combo_4', 'combo', 4, 'skill', '/multiplayer', '🔥'),
  q('combo_6', 'combo', 6, 'skill', '/multiplayer', '💥'),
  // PVP — same-language is guaranteed by matchmaking; beating a human is rare/brag-worthy
  q('mp_win', 'mpWin', 1, 'pvp', '/multiplayer', '👑'),
  q('beat_human', 'beatHuman', 1, 'pvp', '/multiplayer', '⚔️'),
  // DISCOVERY — steer to PUBLIC modes only
  q('play_mp', 'playMode', 1, 'discovery', '/multiplayer', '🎮', 'multiplayer'),
  q('play_brain', 'playMode', 1, 'discovery', '/brain', '🧠', 'brain'),
  q('play_wordhunt', 'playMode', 1, 'discovery', '/daily', '🔎', 'word-hunt'),
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
 * Diversity rules: no two quests of the same condition type; at most one PvP
 * quest (so a solo player can still complete all 3 / Grand Slam).
 */
export function getDailyQuests(
  dateStr?: string,
): [DailyQuest, DailyQuest, DailyQuest] {
  const shuffled = seededShuffle(DAILY_QUEST_POOL, seedFor(dateStr));
  const picked: DailyQuest[] = [];
  const usedTypes = new Set<QuestConditionType>();
  let pvpCount = 0;

  for (const quest of shuffled) {
    if (picked.length === 3) break;
    if (usedTypes.has(quest.type)) continue;
    if (quest.family === 'pvp' && pvpCount >= 1) continue;
    picked.push(quest);
    usedTypes.add(quest.type);
    if (quest.family === 'pvp') pvpCount++;
  }
  // Relaxation pass (should never be needed with the current pool size, but
  // guarantees exactly 3 rather than a silent short array — Class 4).
  for (const quest of shuffled) {
    if (picked.length === 3) break;
    if (picked.includes(quest)) continue;
    picked.push(quest);
  }

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
