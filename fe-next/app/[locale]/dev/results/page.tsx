'use client';

/**
 * DEV-ONLY visual QA harness for the multiplayer results screen.
 * Mounts ResultsMainContent with mock data so the layout/arc can be
 * screenshotted headless without a live multiplayer game.
 * Route: /[locale]/dev/results   (e.g. /en/dev/results, /he/dev/results)
 */

import React, { useState } from 'react';
import ResultsMainContent from '@/components/results/ResultsMainContent';
import BlastResultsScene from '@/components/results/BlastResultsScene';
import WheelRushResultsScene from '@/components/results/WheelRushResultsScene';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Player } from '@/components/results/types';

type Scenario = 'win_1v1' | 'lose_1v1' | 'win_lobby' | 'midpack_lobby' | 'solo' | 'blast_scene' | 'wheel_scene';

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'win_1v1', label: '1v1 — You Win' },
  { id: 'lose_1v1', label: '1v1 — You Lose' },
  { id: 'win_lobby', label: '8p — You Win' },
  { id: 'midpack_lobby', label: '8p — You 5th' },
  { id: 'solo', label: 'Solo' },
  { id: 'blast_scene', label: 'Blast stats' },
  { id: 'wheel_scene', label: 'Wheel Rush' },
];

const NAMES = ['Maya', 'Leo', 'Priya', 'Sam', 'Noor', 'Kai', 'Tess', 'Otto'];

function mkPlayer(name: string, score: number): Player {
  return {
    username: name,
    score,
    allWords: [
      { word: 'quartz', score: 24, validated: true, isDuplicate: false },
      { word: 'jumble', score: 18, validated: true, isDuplicate: name === 'You' },
      { word: 'vex', score: 9, validated: true, isDuplicate: false },
    ] as never,
  } as Player;
}

function buildScores(scenario: Scenario): { scores: Player[]; rank: number; winner: boolean } {
  const you = mkPlayer('You', 0);
  switch (scenario) {
    case 'win_1v1': {
      you.score = 312;
      return { scores: [you, mkPlayer('Leo', 268)], rank: 1, winner: true };
    }
    case 'lose_1v1': {
      you.score = 248;
      return { scores: [mkPlayer('Maya', 305), you], rank: 2, winner: false };
    }
    case 'win_lobby': {
      you.score = 410;
      const others = [358, 340, 299, 271, 240, 205, 188].map((s, i) => mkPlayer(NAMES[i], s));
      return { scores: [you, ...others], rank: 1, winner: true };
    }
    case 'midpack_lobby': {
      you.score = 271;
      const above = [410, 358, 340, 299].map((s, i) => mkPlayer(NAMES[i], s));
      const below = [240, 205, 188].map((s, i) => mkPlayer(NAMES[i + 4], s));
      return { scores: [...above, you, ...below], rank: 5, winner: false };
    }
    case 'solo':
    default: {
      // blast_scene / wheel_scene render their own scene and ignore this;
      // return a solo default so every Scenario has a return path.
      you.score = 287;
      return { scores: [you], rank: 1, winner: true };
    }
  }
}

export default function DevResultsPage() {
  const [scenario, setScenario] = useState<Scenario>('lose_1v1');
  const { t } = useLanguage();

  if (process.env.NODE_ENV === 'production') return null;

  const { scores, rank, winner } = buildScores(scenario);
  const me = scores.find((p) => p.username === 'You') ?? null;
  const validWords = (me?.allWords ?? []).map((w) => ({
    word: typeof w === 'string' ? w : w.word,
    score: typeof w === 'string' ? 0 : w.score ?? 0,
  }));

  const props = {
    sortedScores: scores,
    nearMisses: [],
    isHost: true,
    onStartGame: () => {},
    onMarkReady: () => {},
    onExit: () => {},
    winStreakData: winner ? { currentStreak: 3, bestStreak: 5, isNewMilestone: false, previousStreak: 2 } : null,
    xpGainedData: {
      xpEarned: winner ? 120 : 45,
      xpBreakdown: { gameCompletion: 20, scoreXp: 25, winBonus: winner ? 75 : 0, achievementXp: 0 },
      newTotalXp: 2840,
      newLevel: 7,
    },
    levelUpData: null,
    isAuthenticated: true,
    currentPlayerData: me,
    isCurrentUserWinner: winner,
    currentPlayerValidWords: validWords,
    currentPlayerRank: rank,
    normalizeUsername: (n: string | undefined | null) => n || '',
    username: 'You',
    gameCode: 'DEV01',
    isBotsOnlyGame: false,
    isCurrentPlayerReady: false,
    readyUsernames: [],
    duplicateRuleDisabled: false,
    gameMode: 'classic',
    coinReward: { awarded: winner ? 85 : 30, breakdown: { base: 20, scoreBonus: 10, placement: winner ? 50 : 0, streak: winner ? 5 : 0 } },
    shareCardStats: { maxCombo: 4, longestWord: 'QUARTZ' },
    t,
  };

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`px-3 py-1.5 text-xs font-neo-body font-bold border-2 border-black rounded-neo ${
                scenario === s.id ? 'bg-neo-lime text-black shadow-hard-pressed' : 'bg-neo-navy-light text-neo-white shadow-hard-sm'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div id="results-measure">
          {scenario === 'wheel_scene' ? (
            <WheelRushResultsScene
              playerStats={{
                You: { totalScore: 312, wordsLocked: 9, wordsStolen: 4, bestWord: 'QUARTZ' } as never,
                Leo: { totalScore: 268, wordsLocked: 7, wordsStolen: 2, bestWord: 'JUMBLE' } as never,
                Priya: { totalScore: 240, wordsLocked: 6, wordsStolen: 5, bestWord: 'VEX' } as never,
                Sam: { totalScore: 198, wordsLocked: 4, wordsStolen: 1, bestWord: 'OWL' } as never,
              }}
              scores={[{ username: 'You' }, { username: 'Leo' }, { username: 'Priya' }, { username: 'Sam' }]}
              currentUsername="You"
            />
          ) : scenario === 'blast_scene' ? (
            <BlastResultsScene
              playerStats={{
                You: { maxCombo: 6, gemsCollected: 11, wordsFound: ['quartz', 'jumble'], bestWord: 'QUARTZ', tilesCleared: 58, totalTileBonus: 40, boardClears: 2 },
                Leo: { maxCombo: 3, gemsCollected: 5, wordsFound: ['vex'], bestWord: 'VEX', tilesCleared: 31, totalTileBonus: 12, boardClears: 0 },
              }}
              scores={{ You: 312, Leo: 268 }}
              currentUsername="You"
            />
          ) : (
            <ResultsMainContent {...(props as any)} />
          )}
        </div>
      </div>
    </div>
  );
}
