'use client';

import { useEffect, useRef, useState } from 'react';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';
import { playGameOverBurst } from '@/lib/word-craft/pixi/scenes/gameOverBurst';
import { shouldCelebrateEnding } from '@/lib/word-craft/celebration/endingCelebration';
import { compareDuel, type parseDuel } from '@/lib/word-craft/duel';
import { recordBest } from '@/lib/word-craft/bestScore';
import { recordDaily, todayUtc, type DailyState } from '@/lib/word-craft/daily';
import { emitWordCraftGameEnd } from '@/components/word-craft/wordCraftTelemetry';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface DuelOutcome {
  outcome: 'win' | 'lose' | 'tie';
  challengerName: string;
  challengerScore: number;
  challengerAvatar?: CustomAvatarConfig;
}

interface Args {
  state: WordCraftState;
  sceneCtx: SceneCtx | null;
  hotseat: boolean;
  daily: boolean;
  duel: ReturnType<typeof parseDuel>;
  unnamedChallenger: string;
  playerTerritory: number;
  botTerritory: number;
  cosyMode: boolean;
  reducedMotion: boolean;
  playNewBest: () => void;
  onOver: () => void;
}

/** Everything that happens once, the moment a game ends: telemetry, finale burst, best score, duel verdict, daily streak. */
export function useWordCraftGameOver({
  state, sceneCtx, hotseat, daily, duel, unnamedChallenger, playerTerritory, botTerritory, cosyMode, reducedMotion, playNewBest, onOver,
}: Args) {
  const [newBest, setNewBest] = useState(false);
  const [duelOutcome, setDuelOutcome] = useState<DuelOutcome | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyState | null>(null);
  const recordedRef = useRef(false);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (state.turn !== 'over') {
      recordedRef.current = false;
      trackedRef.current = false;
      setNewBest(false);
      setDuelOutcome(null);
      setDailyResult(null);
      return;
    }
    if (!trackedRef.current) {
      trackedRef.current = true;
      emitWordCraftGameEnd(state, { hotseat });
    }
    onOver();
    // Confetti only on a WIN, never a loss/tie (reads as mocking), never cosy/reduced-motion.
    if (sceneCtx && shouldCelebrateEnding({ playerScore: playerTerritory, botScore: botTerritory, hotseat, cosyMode, reducedMotion })) {
      playGameOverBurst(sceneCtx).catch(() => {
        // Pixi can fail on low-end devices; the dialog still shows
      });
    }
    if (recordedRef.current) return;
    if (duel) {
      setDuelOutcome({
        outcome: compareDuel(playerTerritory, duel.score),
        challengerName: duel.name || unnamedChallenger,
        challengerScore: duel.score,
        challengerAvatar: duel.avatar,
      });
    }
    if (hotseat) return;
    recordedRef.current = true;
    if (recordBest('territory', playerTerritory).isNewBest) {
      setNewBest(true);
      playNewBest();
    }
    if (daily) setDailyResult(recordDaily(todayUtc()));
  }, [state, sceneCtx, hotseat, daily, duel, unnamedChallenger, playerTerritory, botTerritory, cosyMode, reducedMotion, playNewBest, onOver]);

  return { newBest, duelOutcome, dailyResult };
}
