'use client';

/**
 * DEV-ONLY visual QA harness for the multiplayer results screen.
 * Mounts the MP results pieces (standings, my card, DETAILS words + awards) with mock data so the layout/arc can be
 * screenshotted headless without a live multiplayer game.
 * Route: /[locale]/dev/results   (e.g. /en/dev/results, /he/dev/results)
 */

import React, { useMemo, useState } from 'react';
import { MpStandingsBoard } from '@/components/multiplayer/results/MpStandingsBoard';
import { MpMyCard } from '@/components/multiplayer/results/MpMyCard';
import { MpDetailsWords } from '@/components/multiplayer/results/MpDetailsWords';
import { MpRoundAwards } from '@/components/multiplayer/results/MpResultsAlbum';
import { buildMpStandings, podiumTier } from '@/components/multiplayer/results/mpStandings';
import { pickBestWord } from '@/components/multiplayer/results/mpResultsView';
import { resultCallout, roundAwards } from '@/components/multiplayer/results/mpResultsStory';
import { selectUniqueWords } from '@/lib/results/selectUniqueWords';
import BlastResultsScene from '@/components/results/BlastResultsScene';
import WheelRushResultsScene from '@/components/results/WheelRushResultsScene';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Player, WordObject } from '@/components/results/types';

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

  const { scores } = useMemo(() => buildScores(scenario), [scenario]);
  const rows = useMemo(() => buildMpStandings({ sortedScores: scores, username: 'You', normalizeUsername: (n) => n || '' }), [scores]);
  if (process.env.NODE_ENV === 'production') return null;

  const me = scores.find((p) => p.username === 'You') ?? null;
  const myRow = rows.find((r) => r.isMe);
  const allPlayerWords = Object.fromEntries(scores.map((p) => [p.username, (p.allWords ?? []) as WordObject[]]));
  const callout = resultCallout({ rows, uniqueCount: selectUniqueWords(allPlayerWords, 'You').length });

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              type="button"
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
            <div className="flex flex-col gap-3">
              <MpStandingsBoard rows={rows} hiddenCount={0} isRevealed={() => true} t={t} />
              <MpMyCard
                rank={myRow?.rank ?? 1}
                winner={myRow ? podiumTier(myRow) === 1 && rows.length > 1 : false}
                total={rows.length}
                score={me?.score ?? 0}
                bestWord={pickBestWord(me?.allWords as never)}
                xp={45}
                coins={30}
                callout={callout}
                revealed
                t={t}
              />
              <MpDetailsWords myWords={me?.allWords as never} allPlayerWords={allPlayerWords} username="You" missedWords={[{ word: 'owl', score: 4, foundBy: [] }]} language="en" t={t} />
              <MpRoundAwards awards={roundAwards(scores as never)} t={t} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
