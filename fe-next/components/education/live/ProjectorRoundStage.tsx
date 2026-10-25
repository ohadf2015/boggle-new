'use client';

import { Smartphone } from 'lucide-react';
import type { LetterGrid, WheelPuzzle } from '@/shared/types/game';
import ProjectorBoard, { projectorShowsBoard } from './ProjectorBoard';
import ProjectorWheel from './ProjectorWheel';
import type { Translate } from './eduLiveStyles';

/** Every phone plays its own board here, so the wall explains the round instead of showing a board nobody has. */
const PHONE_BOARD_MODES = new Set(['blast', 'wordcraft']);

function ProjectorPhoneMode({ mode, t }: { mode: string; t: Translate }) {
  return (
    <div
      data-testid="projector-phone-mode"
      className="hidden h-full max-h-full w-[min(40%,28rem)] shrink-0 flex-col items-center justify-center gap-[1.2vw] rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-[1.5vw] text-center text-neo-cream shadow-hard-lg md:flex"
    >
      <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-[1.1vw] font-black uppercase text-neo-black shadow-hard-sm">
        <Smartphone className="size-[1.3vw]" aria-hidden="true" />
        {t('eduShell.delivery.phones')}
      </span>
      <p className="font-neo-display text-[3vw] font-black uppercase leading-none">{t(`teacher.classroom.gameModes.${mode}`)}</p>
      <p className="max-w-[24ch] font-neo-body text-[1.4vw] font-bold leading-snug text-neo-cream/85">{t(`education.modePicker.how.${mode}`)}</p>
    </div>
  );
}

export function ProjectorRoundStage({ gameMode, grid, wheelPuzzle, t }: { gameMode?: string; grid?: LetterGrid | null; wheelPuzzle: WheelPuzzle | null; t: Translate }) {
  if (grid && projectorShowsBoard(gameMode, grid)) return <ProjectorBoard grid={grid} label={t('eduLiveRoom.round.boardLabel')} />;
  if (wheelPuzzle) return <ProjectorWheel puzzle={wheelPuzzle} label={t('eduLiveRoom.round.wheelLabel')} />;
  if (gameMode && PHONE_BOARD_MODES.has(gameMode)) return <ProjectorPhoneMode mode={gameMode} t={t} />;
  return null;
}
