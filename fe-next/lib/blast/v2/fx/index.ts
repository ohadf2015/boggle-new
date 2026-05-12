import type { CellId } from '../types';

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
}: {
  boardRef: React.RefObject<HTMLDivElement>;
  modeColor: string;
}): BlastFxApi {
  return {
    playWordFound: () => {},
    playCascade: () => {},
    playBonus: () => {},
    playDoubleBonus: () => {},
    playGemCollected: () => {},
    playInvalid: () => {},
    playFrozenThaw: () => {},
    playGravityCollapse: () => {},
    playLateralSlide: () => {},
    playLevelComplete: () => {},
    playChestProgressFill: () => {},
    playChestUnlock: () => {},
    playChestOpen: () => {},
    playAvatarPartDrop: () => {},
    playHintShuffle: () => {},
    playHintRevealLetter: () => {},
    playHintRevealWord: () => {},
  };
}
