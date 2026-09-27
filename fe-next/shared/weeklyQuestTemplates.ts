/**
 * Weekly Quest Templates & Pure Helpers
 *
 * Client-safe: NO Node.js imports (no supabase, redis, logger).
 * Shared between frontend hooks and backend quest manager.
 */

// --- Types ---

export type QuestDifficulty = 'easy' | 'medium' | 'hard';

export interface AvatarPartReward {
  category: string;
  partId: string;
}

export interface QuestTemplate {
  id: string;
  difficulty: QuestDifficulty;
  type: string;
  description: string;
  target: number;
  /** Display target for UI (e.g. combo shows 15 even though internal target is 1) */
  displayTarget?: number;
  xpReward: number;
  avatarPartReward: AvatarPartReward;
}

export interface ActiveQuest {
  id: string;
  questType: string;
  title: string;
  description: string;
  target: number;
  /** Display target for UI (e.g. combo shows 15 even though internal target is 1) */
  displayTarget?: number;
  current: number;
  xpReward: number;
  completed: boolean;
  difficulty: QuestDifficulty;
  weekStart: string;
  avatarPartReward?: AvatarPartReward;
}

export interface GameStats {
  gamesPlayed?: number;
  wordsFound?: number;
  dailyChallengesCompleted?: number;
  longWordsFound?: number;
  multiplayerWins?: number;
  maxCombo?: number;
  wordsInSession?: number;
  dailyMissionDaysCompleted?: number;
  maxScore?: number;
}

// --- Avatar Part Reward Pools ---
// Easy/Medium quests reward VIP-tier parts, Hard quests reward Epic-tier parts.
// Each pool is cycled deterministically per week so the UI can show a preview.

const EASY_AVATAR_REWARDS: AvatarPartReward[] = [
  { category: 'eyes', partId: 'monocleEye' },
  { category: 'mouth', partId: 'blowfish' },
  { category: 'accessory', partId: 'headphones' },
  { category: 'eyebrows', partId: 'arched' },
  { category: 'mouth', partId: 'zipper' },
  { category: 'eyes', partId: 'confident' },
];

const MEDIUM_AVATAR_REWARDS: AvatarPartReward[] = [
  { category: 'accessory', partId: 'crown' },
  { category: 'hair', partId: 'elvis' },
  { category: 'eyes', partId: 'laser' },
  { category: 'accessory', partId: 'viking' },
  { category: 'mouth', partId: 'goldTooth' },
  { category: 'hair', partId: 'spaceBuns' },
  { category: 'facialHair', partId: 'handlebar' },
  { category: 'accessory', partId: 'devilHorns' },
];

const HARD_AVATAR_REWARDS: AvatarPartReward[] = [
  { category: 'eyes', partId: 'galaxy' },
  { category: 'accessory', partId: 'wizardHat' },
  { category: 'hair', partId: 'flame' },
  { category: 'mouth', partId: 'dragon' },
  { category: 'accessory', partId: 'samurai' },
  { category: 'hair', partId: 'neon' },
  { category: 'eyes', partId: 'flame' },
  { category: 'accessory', partId: 'ninjaScarf' },
];

const AVATAR_REWARD_POOLS: Record<QuestDifficulty, AvatarPartReward[]> = {
  easy: EASY_AVATAR_REWARDS,
  medium: MEDIUM_AVATAR_REWARDS,
  hard: HARD_AVATAR_REWARDS,
};

/** Pick avatar part reward for a given difficulty and week number */
export function pickAvatarReward(difficulty: QuestDifficulty, weekNum: number): AvatarPartReward {
  const pool = AVATAR_REWARD_POOLS[difficulty];
  return pool[weekNum % pool.length];
}

// --- Quest Pools ---

type QuestWithoutIdAndReward = Omit<QuestTemplate, 'id' | 'avatarPartReward'>;

const EASY_QUESTS: QuestWithoutIdAndReward[] = [
  { difficulty: 'easy', type: 'play_games', description: 'weeklyQuest.desc.playGames', target: 3, xpReward: 200 },
  { difficulty: 'easy', type: 'find_words', description: 'weeklyQuest.desc.findWords', target: 50, xpReward: 200 },
  { difficulty: 'easy', type: 'daily_challenges', description: 'weeklyQuest.desc.dailyChallenges', target: 2, xpReward: 200 },
];

const MEDIUM_QUESTS: QuestWithoutIdAndReward[] = [
  { difficulty: 'medium', type: 'long_words', description: 'weeklyQuest.desc.longWords', target: 20, xpReward: 500 },
  { difficulty: 'medium', type: 'mp_wins', description: 'weeklyQuest.desc.mpWins', target: 3, xpReward: 500 },
  { difficulty: 'medium', type: 'combo_15', description: 'weeklyQuest.desc.combo', target: 1, displayTarget: 15, xpReward: 500 },
];

const HARD_QUESTS: QuestWithoutIdAndReward[] = [
  { difficulty: 'hard', type: 'find_words_session', description: 'weeklyQuest.desc.findWordsSession', target: 100, xpReward: 1000 },
  { difficulty: 'hard', type: 'daily_missions_streak', description: 'weeklyQuest.desc.dailyMissionsStreak', target: 3, xpReward: 1000 },
  { difficulty: 'hard', type: 'high_score', description: 'weeklyQuest.desc.highScore', target: 1, displayTarget: 650, xpReward: 1000 },
];

// --- Pure Helpers ---

/** Get Monday of the week for a given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().split('T')[0];
}

/** Get week number from epoch for deterministic selection */
export function getWeekNumber(weekStart: string): number {
  const epoch = new Date('2024-01-01').getTime();
  const ms = new Date(weekStart).getTime() - epoch;
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

function getWeekStartFromNumber(weekNum: number): string {
  const epoch = new Date('2024-01-01').getTime();
  const d = new Date(epoch + weekNum * 7 * 24 * 60 * 60 * 1000);
  return getWeekStart(d);
}

function pickFromPool(pool: QuestWithoutIdAndReward[], weekNum: number): QuestTemplate {
  const idx = weekNum % pool.length;
  const quest = pool[idx];
  const weekStart = getWeekStartFromNumber(weekNum);
  const avatarPartReward = pickAvatarReward(quest.difficulty, weekNum);
  return { ...quest, avatarPartReward, id: `${quest.difficulty}_${quest.type}_${weekStart}` };
}

/** Returns 3 quest options for this week (Easy/Medium/Hard) */
export function getAvailableQuests(date?: Date): QuestTemplate[] {
  const weekStart = getWeekStart(date);
  const weekNum = getWeekNumber(weekStart);
  return [
    pickFromPool(EASY_QUESTS, weekNum),
    pickFromPool(MEDIUM_QUESTS, weekNum),
    pickFromPool(HARD_QUESTS, weekNum),
  ];
}

/** Map quest type to difficulty */
export function getDifficultyFromType(type: string): QuestDifficulty {
  if (EASY_QUESTS.some(q => q.type === type)) return 'easy';
  if (MEDIUM_QUESTS.some(q => q.type === type)) return 'medium';
  return 'hard';
}

/** Get display target for a quest type (e.g. combo_15 shows 15 even though internal target is 1) */
export function getDisplayTargetForType(type: string): number | undefined {
  const allQuests = [...EASY_QUESTS, ...MEDIUM_QUESTS, ...HARD_QUESTS];
  const quest = allQuests.find(q => q.type === type);
  return quest?.displayTarget;
}

/** Map stat to quest progress delta */
export function getStatDelta(questType: string, stats: GameStats): number {
  switch (questType) {
    case 'play_games': return stats.gamesPlayed ?? 0;
    case 'find_words': return stats.wordsFound ?? 0;
    case 'daily_challenges': return stats.dailyChallengesCompleted ?? 0;
    case 'long_words': return stats.longWordsFound ?? 0;
    case 'mp_wins': return stats.multiplayerWins ?? 0;
    case 'combo_15': return (stats.maxCombo ?? 0) >= 15 ? 1 : 0;
    case 'find_words_session': return stats.wordsInSession ?? 0;
    case 'daily_missions_streak': return stats.dailyMissionDaysCompleted ?? 0;
    case 'high_score': return (stats.maxScore ?? 0) >= 650 ? 1 : 0;
    default: return 0;
  }
}
