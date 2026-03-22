/**
 * Weekly Quest Manager
 *
 * Every Monday, players pick 1 of 3 quests (Easy/Medium/Hard).
 * Progress tracked throughout the week.
 * Quests deterministically generated from week number.
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';

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

// --- Quest Templates ---

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

// --- Helpers ---

/** Get Monday of the week for a given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // Days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().split('T')[0];
}

/** Get week number from epoch for deterministic selection */
function getWeekNumber(weekStart: string): number {
  const epoch = new Date('2024-01-01').getTime();
  const ms = new Date(weekStart).getTime() - epoch;
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

/** Pick quest from pool using week number as seed */
function pickFromPool(pool: Omit<QuestTemplate, 'id'>[], weekNum: number): QuestTemplate {
  const idx = weekNum % pool.length;
  const quest = pool[idx];
  const weekStart = getWeekStartFromNumber(weekNum);
  return { ...quest, id: `${quest.difficulty}_${quest.type}_${weekStart}` };
}

function getWeekStartFromNumber(weekNum: number): string {
  const epoch = new Date('2024-01-01').getTime();
  const d = new Date(epoch + weekNum * 7 * 24 * 60 * 60 * 1000);
  return getWeekStart(d);
}

// --- Stat-to-quest type mapping ---

function getStatDelta(questType: string, stats: GameStats): number {
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

function getDifficultyFromType(type: string): QuestDifficulty {
  if (EASY_QUESTS.some(q => q.type === type)) return 'easy';
  if (MEDIUM_QUESTS.some(q => q.type === type)) return 'medium';
  return 'hard';
}

// --- Public API ---

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

/** Player picks their quest for the week. Only one per week. */
export async function selectQuest(playerId: string, questId: string): Promise<ActiveQuest> {
  const supabase = getSupabase()!;
  const weekStart = getWeekStart();

  // Check for existing quest this week
  const { data: existing } = await supabase
    .from('weekly_quests')
    .select('id')
    .eq('player_id', playerId)
    .eq('week_start', weekStart)
    .single();

  if (existing) {
    throw new Error('Player has already selected a quest this week');
  }

  // Find quest template
  const available = getAvailableQuests();
  const template = available.find(q => q.id === questId);
  if (!template) throw new Error('Invalid quest id');

  const { data, error } = await supabase
    .from('weekly_quests')
    .insert({
      player_id: playerId,
      week_start: weekStart,
      quest_type: template.type,
      title: template.description,
      description: template.description,
      requirements: JSON.stringify({ target: template.target, type: template.type }),
      current_progress: JSON.stringify({ current: 0 }),
      xp_reward: template.xpReward,
      completed: false,
    })
    .select('id, quest_type, title, description, requirements, current_progress, xp_reward, completed, week_start')
    .single();

  if (error) {
    logger.error('weeklyQuest', `Failed to insert weekly quest for ${playerId}: ${error.message}`);
    throw new Error('Failed to select quest');
  }

  return parseQuestRow(data);
}

/** Returns selected quest + current progress, or null */
export async function getActiveQuest(playerId: string): Promise<ActiveQuest | null> {
  const supabase = getSupabase()!;
  const weekStart = getWeekStart();

  const { data, error } = await supabase
    .from('weekly_quests')
    .select('id, quest_type, title, description, requirements, current_progress, xp_reward, completed, week_start')
    .eq('player_id', playerId)
    .eq('week_start', weekStart)
    .single();

  if (error || !data) return null;
  return parseQuestRow(data);
}

/** Update progress based on game stats. Returns updated quest or null. */
export async function updateQuestProgress(
  playerId: string,
  stats: GameStats,
): Promise<ActiveQuest | null> {
  const quest = await getActiveQuest(playerId);
  if (!quest || quest.completed) return null;

  const delta = getStatDelta(quest.questType, stats);
  if (delta <= 0) return null;

  const supabase = getSupabase()!;
  const newCurrent = Math.min(quest.current + delta, quest.target);
  const completed = newCurrent >= quest.target;

  const { data, error } = await supabase
    .from('weekly_quests')
    .update({
      current_progress: JSON.stringify({ current: newCurrent }),
      completed,
      ...(completed ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', quest.id)
    .single();

  if (error) {
    logger.error('weeklyQuest', `Failed to update quest progress for ${playerId}: ${error.message}`);
    return null;
  }

  return { ...quest, current: newCurrent, completed };
}

// --- Row parser ---

interface QuestRow {
  id: string;
  quest_type: string;
  title: string;
  description: string;
  requirements: string;
  current_progress: string;
  xp_reward: number;
  completed: boolean;
  week_start: string;
}

function parseQuestRow(row: QuestRow): ActiveQuest {
  const reqs = typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements;
  const progress = typeof row.current_progress === 'string' ? JSON.parse(row.current_progress) : row.current_progress;
  return {
    id: row.id,
    questType: row.quest_type,
    title: row.title,
    description: row.description,
    target: reqs.target,
    current: progress.current ?? 0,
    xpReward: row.xp_reward,
    completed: row.completed,
    difficulty: getDifficultyFromType(row.quest_type),
    weekStart: row.week_start,
  };
}
