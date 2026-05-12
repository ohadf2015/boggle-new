import * as PIXI from 'pixi.js';
import { useReducedMotion } from 'framer-motion';
import type { CellId } from '../types';
import {
  playWordFoundFx,
  playCascadeFx,
  playBonusFx,
  playDoubleBonusFx,
  playGemCollectedFx,
  playFrozenThawFx,
  playInvalidFx,
  playGravityCollapseFx,
  playLateralSlideFx,
  playLevelCompleteFx,
  playChestProgressFillFx,
  playChestUnlockFx,
  playChestOpenFx,
  playAvatarPartDropFx,
  playHintShuffleFx,
  playHintRevealLetterFx,
  playHintRevealWordFx,
} from './burst';

export type BlastFxApi = {
  playWordFound: (cells: CellId[]) => void;
  playCascade: (cells: CellId[]) => void;
  playBonus: (cells: CellId[]) => void;
  playDoubleBonus: (cells: CellId[]) => void;
  playGemCollected: (cells: CellId[]) => void;
  playInvalid: (boardEl: Element) => void;
  playFrozenThaw: (cells: CellId[]) => void;
  playGravityCollapse: (staggerMs: number) => void;
  playLateralSlide: (from: CellId, to: CellId) => void;
  playLevelComplete: () => void;
  playChestProgressFill: () => void;
  playChestUnlock: () => void;
  playChestOpen: (tier: 'wood' | 'silver' | 'gold' | 'legendary') => void;
  playAvatarPartDrop: () => void;
  playHintShuffle: () => void;
  playHintRevealLetter: (cell: CellId) => void;
  playHintRevealWord: (cells: CellId[]) => void;
};

export function useBlastFx({
  boardRef,
  modeColor,
  pixiStage,
}: {
  boardRef: React.RefObject<HTMLDivElement>;
  modeColor: string;
  pixiStage?: PIXI.Container;
}): BlastFxApi {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const isHapticsEnabled =
    typeof window !== 'undefined' && localStorage.getItem('haptics-enabled') !== 'false';

  // Use provided stage or create a minimal stub
  const stage = pixiStage || ({} as PIXI.Container);

  return {
    playWordFound: (cells) =>
      playWordFoundFx(boardRef, stage, cells, modeColor, prefersReducedMotion, isHapticsEnabled),
    playCascade: (cells) =>
      playCascadeFx(boardRef, stage, cells, modeColor, prefersReducedMotion, isHapticsEnabled),
    playBonus: (cells) =>
      playBonusFx(boardRef, stage, cells, modeColor, prefersReducedMotion, isHapticsEnabled),
    playDoubleBonus: (cells) =>
      playDoubleBonusFx(
        boardRef,
        stage,
        cells,
        modeColor,
        prefersReducedMotion,
        isHapticsEnabled
      ),
    playGemCollected: (cells) =>
      playGemCollectedFx(
        boardRef,
        stage,
        cells,
        modeColor,
        prefersReducedMotion,
        isHapticsEnabled
      ),
    playInvalid: (boardEl) =>
      playInvalidFx(boardRef, boardEl, modeColor, prefersReducedMotion, isHapticsEnabled),
    playFrozenThaw: (cells) =>
      playFrozenThawFx(boardRef, stage, cells, modeColor, prefersReducedMotion, isHapticsEnabled),
    playGravityCollapse: (staggerMs) => playGravityCollapseFx(staggerMs),
    playLateralSlide: (from, to) =>
      playLateralSlideFx(from, to, prefersReducedMotion, isHapticsEnabled),
    playLevelComplete: () =>
      playLevelCompleteFx(boardRef, stage, modeColor, prefersReducedMotion, isHapticsEnabled),
    playChestProgressFill: () =>
      playChestProgressFillFx(stage, modeColor, isHapticsEnabled),
    playChestUnlock: () => playChestUnlockFx(stage, modeColor, isHapticsEnabled),
    playChestOpen: (tier) =>
      playChestOpenFx(stage, tier, modeColor, prefersReducedMotion, isHapticsEnabled),
    playAvatarPartDrop: () => playAvatarPartDropFx(stage, isHapticsEnabled),
    playHintShuffle: () =>
      playHintShuffleFx(boardRef, stage, prefersReducedMotion, isHapticsEnabled),
    playHintRevealLetter: (cell) =>
      playHintRevealLetterFx(boardRef, cell, prefersReducedMotion, isHapticsEnabled),
    playHintRevealWord: (cells) =>
      playHintRevealWordFx(boardRef, cells, modeColor, prefersReducedMotion, isHapticsEnabled),
  };
}
