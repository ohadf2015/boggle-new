'use client';

import { useEffect, useRef } from 'react';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';
import { playWordCommitWave } from '@/lib/word-craft/pixi/scenes/wordCommitWave';
import { playScoreConfetti } from '@/lib/word-craft/pixi/scenes/scoreConfetti';
import { playBotMoveReveal } from '@/lib/word-craft/pixi/scenes/botMoveReveal';

interface GameState {
  history: Array<any>;
  overdrive: boolean;
  pendingPlacements: readonly any[];
}

interface Juice {
  scorePop(el: Element | null, score: number): void;
  botReveal(els: Element[]): void;
  playerCommitReveal(els: Element[]): void;
}

interface Props {
  gameState: GameState;
  juice: Juice;
  t: (k: string) => string;
  sceneCtx: SceneCtx | null;
  onScoreFloat(score: any): void;
  onCelebration(celebration: any): void;
  onAchievement(achievement: any): void;
}

const ENCOURAGEMENT_COUNT = 8;

export function useWordCraftCelebrations(props: Props) {
  const prevHistoryLenRef = useRef(0);
  const overdriveCountRef = useRef(0);
  const firstWordAchievedRef = useRef(false);
  const prevOverdriveRef = useRef(false);

  // History: score float + celebrations + achievements
  useEffect(() => {
    const len = props.gameState.history.length;
    if (len === prevHistoryLenRef.current) return;
    const newest = props.gameState.history[len - 1];
    prevHistoryLenRef.current = len;
    if (!newest || newest.score === 0) return;

    const popEl = document.querySelector(`[data-score-value="${newest.who}"]`);
    props.juice.scorePop(popEl, newest.score);

    const placedEls = newest.placedTileIds
      .map((id: string) => document.querySelector(`[data-tile-id="${id}"]`))
      .filter((n): n is Element => Boolean(n));

    if (newest.who === 'bot' && placedEls.length > 0) {
      props.juice.botReveal(placedEls);
      // Fire Pixi bot move reveal animation
      if (props.sceneCtx) {
        const placements = newest.placedTileIds.map((id: string) => {
          const p = props.gameState.history[len - 1]?.placements.find((pl: any) => pl.rackTileId === id);
          return p ? { row: p.row, col: p.col } : null;
        }).filter((p): p is { row: number; col: number } => Boolean(p));
        playBotMoveReveal(props.sceneCtx, placements).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
      }
    }
    if (newest.who === 'player' && placedEls.length > 0) {
      props.juice.playerCommitReveal(placedEls);
    }

    if (newest.who === 'player') {
      const isBingo = newest.placedTileIds.length >= 7;
      const wasOverdrive = props.gameState.overdrive === false && newest.score > 0;
      const encIdx = Math.floor(Math.random() * ENCOURAGEMENT_COUNT);
      const encouragement = props.t(`wordcraft.encouragement.${encIdx}`);

      props.onScoreFloat({ score: newest.score, overdrive: false, isBingo, encouragement, key: len });

      // Fire Pixi word commit wave
      if (props.sceneCtx) {
        const placements = newest.placedTileIds.map((id: string) => {
          const p = props.gameState.history[len - 1]?.placements.find((pl: any) => pl.rackTileId === id);
          return p ? { row: p.row, col: p.col, letter: p.letter, value: p.value } : null;
        }).filter((p): p is { row: number; col: number; letter: string; value: number } => Boolean(p));
        playWordCommitWave(props.sceneCtx, { placements, totalScore: newest.score }).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
        if (newest.score >= 30) {
          playScoreConfetti(props.sceneCtx).catch(() => {
            // Pixi animations can fail on low-end devices; silently continue
          });
        }
      }

      // Achievement: first word
      if (!firstWordAchievedRef.current) {
        firstWordAchievedRef.current = true;
        props.onAchievement({ key: 'wordcraft_first_word', icon: '🎉' });
      }

      // Achievement: bingo
      if (isBingo) {
        props.onAchievement({ key: 'wordcraft_bingo', icon: '⭐' });
        const target = (placedEls[Math.floor(placedEls.length / 2)] as HTMLElement | undefined) ?? null;
        const rect = target?.getBoundingClientRect();
        props.onCelebration({
          kind: 'bingo',
          burstId: 0,
          origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
        });
      }

      // Achievement: overdrive cashed
      if (wasOverdrive) {
        props.onAchievement({ key: 'wordcraft_overdrive_cash', icon: '🔥' });
        props.onScoreFloat((prev: any) => prev ? { ...prev, overdrive: true } : prev);
      }
    }
  }, [props.gameState.history, props.gameState.overdrive, props.juice, props.t, props.sceneCtx, props.onScoreFloat, props.onCelebration, props.onAchievement]);

  // Overdrive enter
  useEffect(() => {
    const cur = props.gameState.overdrive;
    if (cur && !prevOverdriveRef.current) {
      overdriveCountRef.current++;
      props.onCelebration({ kind: 'overdrive', burstId: 0 });
      props.onAchievement({ key: 'wordcraft_overdrive_enter', icon: '⚡' });

      if (overdriveCountRef.current >= 3) {
        props.onAchievement({ key: 'wordcraft_heat_streak', icon: '🏆', count: overdriveCountRef.current });
      }
    }
    prevOverdriveRef.current = cur;
  }, [props.gameState.overdrive, props.onCelebration, props.onAchievement]);
}
