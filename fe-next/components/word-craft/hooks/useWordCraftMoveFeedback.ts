'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';
import type { useWordCraftJuice } from '@/components/word-craft/useWordCraftJuice';
import type { CelebrationKind } from '@/components/word-craft/WordCraftCelebration';
import { playBotMoveReveal } from '@/lib/word-craft/pixi/scenes/botMoveReveal';
import { playSpectacleCommit } from '@/lib/word-craft/celebration/playSpectacleCommit';
import { resolveCommitTier } from '@/lib/word-craft/celebration/commitTier';
import { pickMiniCelebration } from '@/lib/word-craft/celebration/miniCelebration';
import { cellsGainedThisTurn } from '@/lib/word-craft/territoryFeedback';

const ENCOURAGEMENT_COUNT = 8;

export interface ScoreFloatState {
  score: number;
  overdrive: boolean;
  isBingo: boolean;
  encouragement: string;
  key: number;
}

export interface CelebrationState {
  kind: CelebrationKind;
  burstId: number;
  origin?: { x: number; y: number };
}

interface Args {
  game: ReturnType<typeof useWordCraftGame>;
  juice: ReturnType<typeof useWordCraftJuice>;
  sceneCtx: SceneCtx | null;
  cosyMode: boolean;
  achievementsOn: boolean;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>) => string;
  queueAchievement: (a: { key: string; icon: string }) => void;
  playCommitSound: (ctx: Parameters<typeof resolveCommitTier>[0]) => void;
  playOpponentScored: () => void;
  setScoreFloat: Dispatch<SetStateAction<ScoreFloatState | null>>;
  setCelebration: Dispatch<SetStateAction<CelebrationState>>;
}

/** Reacts to each newly committed move: score pop, tile reveals, Pixi spectacle, sound, confetti, achievements. */
export function useWordCraftMoveFeedback({
  game, juice, sceneCtx, cosyMode, achievementsOn, t, queueAchievement, playCommitSound, playOpponentScored, setScoreFloat, setCelebration,
}: Args) {
  const prevHistoryLenRef = useRef(0);
  const firstWordAchievedRef = useRef(false);

  useEffect(() => {
    const len = game.state.history.length;
    if (len === prevHistoryLenRef.current) return;
    const newest = game.state.history[len - 1];
    prevHistoryLenRef.current = len;
    if (!newest || newest.score === 0) return;

    const popEl = document.querySelector(`[data-score-value="${newest.who}"]`);
    juice.scorePop(popEl, newest.score);

    const placedEls = newest.placedTileIds
      .map((id) => document.querySelector(`[data-tile-id="${id}"]`))
      .filter((n): n is Element => Boolean(n));

    if (newest.who === 'bot' && placedEls.length > 0) {
      juice.botReveal(placedEls);
      // Fire Pixi bot move reveal animation. Placed tiles are on the board
      // post-commit; scan by rackTileId rather than looking in history.
      if (sceneCtx) {
        const placements: { row: number; col: number }[] = [];
        const ids = new Set(newest.placedTileIds);
        for (let r = 0; r < game.state.board.size; r++) {
          for (let c = 0; c < game.state.board.size; c++) {
            const tile = game.state.board.cells[r][c].tile;
            if (tile && ids.has(tile.rackTileId)) placements.push({ row: r, col: c });
          }
        }
        playBotMoveReveal(sceneCtx, placements).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
      }
      // Audio twin of the bot reveal — the opponent scoring was silent before.
      if (newest.score > 0) playOpponentScored();
    }
    if (newest.who === 'player' && placedEls.length > 0) {
      juice.playerCommitReveal(placedEls);
    }

    if (newest.who === 'player') {
      const isBingo = newest.placedTileIds.length >= 7;
      const encIdx = Math.floor(Math.random() * ENCOURAGEMENT_COUNT);
      const encouragement = t(`wordcraft.encouragement.${encIdx}`);

      // The float counts TERRITORY, not points: cells claimed by placing tiles
      // plus cells stolen from the rival this turn.
      const cap = game.state.lastCapture;
      const gain = cellsGainedThisTurn(
        newest.placedTileIds.length,
        'player',
        len - 1,
        cap ? { by: cap.by, cellCount: cap.cells.length, turnIndex: cap.turnIndex } : null,
      );
      setScoreFloat({ score: gain.total, overdrive: false, isBingo, encouragement, key: len });

      // Fire tiered spectacle: tier resolver picks the FX bundle (ripple →
      // wave → path trace → word stamp → edge flash → aurora) per commit
      // size/streak. Cosy mode clamps huge/bingo down to "great" to keep
      // calm-mode players from being blasted by fullscreen flashes.
      if (sceneCtx) {
        const placements: { row: number; col: number; letter: string; value: number }[] = [];
        const ids = new Set(newest.placedTileIds);
        let premiumTriggered = false;
        let hasRareTile = false;
        for (let r = 0; r < game.state.board.size; r++) {
          for (let c = 0; c < game.state.board.size; c++) {
            const tile = game.state.board.cells[r][c].tile;
            if (tile && ids.has(tile.rackTileId)) {
              placements.push({ row: r, col: c, letter: tile.letter, value: tile.value });
              if (game.state.board.cells[r][c].premium) premiumTriggered = true;
              if (tile.value >= 8) hasRareTile = true;
            }
          }
        }
        const commitCtx = {
          scoreThisTurn: newest.score,
          tilesPlaced: newest.placedTileIds.length,
          bingo: isBingo,
          streak: game.state.streaks.player,
          hasRareTile,
          premiumTriggered,
          heatLevel: game.state.heat,
        };
        playSpectacleCommit(sceneCtx, {
          ctx: commitCtx,
          placements,
          word: newest.words[0] ?? '',
          cosyMode,
        }).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
        // Audio twin of the Pixi spectacle — confirm + tier flourish + rare sparkle.
        playCommitSound(commitCtx);
      }

      // Achievement: first word
      if (!firstWordAchievedRef.current && achievementsOn) {
        firstWordAchievedRef.current = true;
        queueAchievement({ key: 'wordcraft_first_word', icon: '🎉' });
      }

      // Confetti bursts: a bingo gets the full 80-particle blast; ordinary turns
      // that are still satisfying — big words, stealing 2+ rival squares, or a
      // streak milestone — get a lighter 'great' pop so the mid-game isn't silent.
      const burstTier = resolveCommitTier({
        scoreThisTurn: newest.score,
        tilesPlaced: newest.placedTileIds.length,
        bingo: isBingo,
        streak: game.state.streaks.player,
        hasRareTile: false,
        premiumTriggered: false,
        heatLevel: game.state.heat,
      });
      const miniKind = pickMiniCelebration({
        tier: burstTier,
        streak: game.state.streaks.player,
        cellsStolen: gain.stolen,
      });
      if (isBingo || miniKind) {
        const target = (placedEls[Math.floor(placedEls.length / 2)] as HTMLElement | undefined) ?? null;
        const rect = target?.getBoundingClientRect();
        setCelebration((prev) => ({
          kind: isBingo ? 'bingo' : 'great',
          burstId: prev.burstId + 1,
          origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
        }));
      }

      // Achievement: bingo
      if (isBingo && achievementsOn) {
        queueAchievement({ key: 'wordcraft_bingo', icon: '⭐' });
      }
    }
  }, [game.state.history, game.state.board, game.state.lastCapture, game.state.streaks.player, game.state.heat, juice, t, queueAchievement, achievementsOn, sceneCtx, cosyMode, playCommitSound, playOpponentScored, setScoreFloat, setCelebration]);
}
