'use client';

import { useState, useCallback, useEffect } from 'react';

const QUEST_DEFS = [
  { id: 'play_games', target: 3, xpReward: 50, coinReward: 25 },
  { id: 'find_long_word', target: 1, xpReward: 30, coinReward: 15 },
  { id: 'reach_combo', target: 1, xpReward: 40, coinReward: 20 },
] as const;

type QuestId = (typeof QUEST_DEFS)[number]['id'];

export interface QuestProgress {
  id: QuestId;
  current: number;
  target: number;
  xpReward: number;
  coinReward: number;
  complete: boolean;
}

interface DailySideQuestsState {
  date: string;
  progress: Record<QuestId, number>;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStorageKey(): string {
  return `lexiclash_daily_quests_${getTodayKey()}`;
}

function loadState(): DailySideQuestsState {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as DailySideQuestsState;
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch {
    // corrupted storage, reset
  }
  return {
    date: today,
    progress: { play_games: 0, find_long_word: 0, reach_combo: 0 },
  };
}

function saveState(state: DailySideQuestsState): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}

export function useDailySideQuests() {
  const [state, setState] = useState<DailySideQuestsState>(() => ({
    date: getTodayKey(),
    progress: { play_games: 0, find_long_word: 0, reach_combo: 0 },
  }));

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  const incrementQuest = useCallback((questId: QuestId, amount = 1) => {
    setState((prev) => {
      const quest = QUEST_DEFS.find((q) => q.id === questId);
      if (!quest) return prev;

      const currentValue = prev.progress[questId] || 0;
      const newValue = Math.min(currentValue + amount, quest.target);

      const next: DailySideQuestsState = {
        ...prev,
        progress: { ...prev.progress, [questId]: newValue },
      };
      saveState(next);
      return next;
    });
  }, []);

  const quests: QuestProgress[] = QUEST_DEFS.map((def) => {
    const current = state.progress[def.id] || 0;
    return {
      id: def.id,
      current,
      target: def.target,
      xpReward: def.xpReward,
      coinReward: def.coinReward,
      complete: current >= def.target,
    };
  });

  const allComplete = quests.every((q) => q.complete);

  const totalRewards = quests.reduce(
    (acc, q) => {
      if (q.complete) {
        acc.xp += q.xpReward;
        acc.coins += q.coinReward;
      }
      return acc;
    },
    { xp: 0, coins: 0 }
  );

  return { quests, incrementQuest, allComplete, totalRewards };
}
