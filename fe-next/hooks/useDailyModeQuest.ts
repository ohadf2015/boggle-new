import { useState, useCallback } from 'react';

export type GameMode = 'blast' | 'classicMp' | 'wordHuntMp';

export interface QuestProgress {
  blast: boolean;
  classicMp: boolean;
  wordHuntMp: boolean;
  completed: boolean;
}

export interface QuestData {
  blast: boolean;
  classicMp: boolean;
  wordHuntMp: boolean;
  claimed: boolean;
}

// ====== Pure logic (exported for testing) ======

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `lexiclash_daily_quest_${y}-${m}-${d}`;
}

export function loadQuestData(): QuestData {
  const key = getTodayKey();
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { blast: false, classicMp: false, wordHuntMp: false, claimed: false };
}

export function saveQuestData(data: QuestData): void {
  localStorage.setItem(getTodayKey(), JSON.stringify(data));
}

/** Deterministic reward 50-150 seeded by UTC date */
export function getDateReward(): number {
  const key = getTodayKey();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return 50 + (Math.abs(hash) % 101);
}

export function markModePlayedLogic(mode: GameMode): QuestData {
  const data = loadQuestData();
  const next = { ...data, [mode]: true };
  saveQuestData(next);
  return next;
}

export function getQuestProgressLogic(): QuestProgress {
  const d = loadQuestData();
  return {
    blast: d.blast,
    classicMp: d.classicMp,
    wordHuntMp: d.wordHuntMp,
    completed: d.blast && d.classicMp && d.wordHuntMp,
  };
}

export function isQuestCompletedLogic(): boolean {
  const d = loadQuestData();
  return d.blast && d.classicMp && d.wordHuntMp;
}

export function claimRewardLogic(): number | null {
  const d = loadQuestData();
  if (!d.blast || !d.classicMp || !d.wordHuntMp) return null;
  if (d.claimed) return null;
  const reward = getDateReward();
  saveQuestData({ ...d, claimed: true });
  return reward;
}

// ====== React hook wrapper ======

export function useDailyModeQuest() {
  const [data, setData] = useState<QuestData>(loadQuestData);

  const markModePlayed = useCallback((mode: GameMode) => {
    const next = markModePlayedLogic(mode);
    setData(next);
  }, []);

  const getQuestProgress = useCallback((): QuestProgress => {
    return getQuestProgressLogic();
  }, []);

  const isQuestCompleted = useCallback((): boolean => {
    return isQuestCompletedLogic();
  }, []);

  const claimReward = useCallback((): number | null => {
    const reward = claimRewardLogic();
    if (reward !== null) setData(loadQuestData());
    return reward;
  }, []);

  return { markModePlayed, getQuestProgress, isQuestCompleted, claimReward, data };
}
