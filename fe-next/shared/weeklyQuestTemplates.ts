/**
 * Weekly Quest Templates & Pure Helpers
 *
 * Client-safe: NO Node.js imports (no supabase, redis, logger).
 * Shared between frontend hooks and backend quest manager.
 */

// --- Types ---

export type QuestDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestTemplate {
  id: string;
  difficulty: QuestDifficulty;
  type: string;
  description: string;
  target: number;
  xpReward: number;
}

export interface ActiveQuest {
  id: string;
  questType: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  difficulty: QuestDifficulty;
  weekStart: string;
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

// --- Quest Pools ---

const EASY_QUESTS: Omit<QuestTemplate, 'id'>[] = [
  { difficulty: 'easy', type: 'play_games', description: 'Play 3 games this week', target: 3, xpReward: 200 },
  { difficulty: 'easy', type: 'find_words', description: 'Find 50 words', target: 50, xpReward: 200 },
  { difficulty: 'easy', type: 'daily_challenges', description: 'Complete 2 daily challenges', target: 2, xpReward: 200 },
];

const MEDIUM_QUESTS: Omit<QuestTemplate, 'id'>[] = [
  { difficulty: 'medium', type: 'long_words', description: 'Find 20 words of 5+ letters', target: 20, xpReward: 500 },
  { difficulty: 'medium', type: 'mp_wins', description: 'Win 3 multiplayer games', target: 3, xpReward: 500 },
  { difficulty: 'medium', type: 'combo_15', description: 'Reach combo 15', target: 15, xpReward: 500 },
];

const HARD_QUESTS: Omit<QuestTemplate, 'id'>[] = [
  { difficulty: 'hard', type: 'find_words_session', description: 'Find 100 words in a single session', target: 100, xpReward: 1000 },
  { difficulty: 'hard', type: 'daily_missions_streak', description: 'Complete all daily missions 3 days', target: 3, xpReward: 1000 },
  { difficulty: 'hard', type: 'high_score', description: 'Score 500+ in one game', target: 500, xpReward: 1000 },
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
function getWeekNumber(weekStart: string): number {
  const epoch = new Date('2024-01-01').getTime();
  const ms = new Date(weekStart).getTime() - epoch;
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

function getWeekStartFromNumber(weekNum: number): string {
  const epoch = new Date('2024-01-01').getTime();
  const d = new Date(epoch + weekNum * 7 * 24 * 60 * 60 * 1000);
  return getWeekStart(d);
}

function pickFromPool(pool: Omit<QuestTemplate, 'id'>[], weekNum: number): QuestTemplate {
  const idx = weekNum % pool.length;
  const quest = pool[idx];
  const weekStart = getWeekStartFromNumber(weekNum);
  return { ...quest, id: `${quest.difficulty}_${quest.type}_${weekStart}` };
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

/** Map stat to quest progress delta */
export function getStatDelta(questType: string, stats: GameStats): number {
  switch (questType) {
    case 'play_games': return stats.gamesPlayed ?? 0;
    case 'find_words': return stats.wordsFound ?? 0;
    case 'daily_challenges': return stats.dailyChallengesCompleted ?? 0;
    case 'long_words': return stats.longWordsFound ?? 0;
    case 'mp_wins': return stats.multiplayerWins ?? 0;
    case 'combo_15': return stats.maxCombo ?? 0;
    case 'find_words_session': return stats.wordsInSession ?? 0;
    case 'daily_missions_streak': return stats.dailyMissionDaysCompleted ?? 0;
    case 'high_score': return stats.maxScore ?? 0;
    default: return 0;
  }
}
