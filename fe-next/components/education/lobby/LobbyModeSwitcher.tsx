/**
 * "We're playing X. Change it." — one slim row above a live lobby.
 *
 * The gap this closes, reproduced by a blind critic: once GO LIVE had fired,
 * changing the game meant EXITING, which ends the room for every student
 * already in it, and coming back with a different code the class has to
 * retype. A teacher reads a room in the first ten seconds; the product has to
 * let them act on that without charging the class its seats.
 *
 * It lives where `ClassroomModeBanner` used to render nothing. That early
 * return exists so the projector owns the code and the QR — one code on one
 * wall — and nothing here re-prints either of those. This row carries the
 * game's name and one control.
 *
 * Slim by construction: the projector lobby below it is the surface that must
 * stay readable from the back row, so this is a single 44px row, and the four
 * alternatives appear only after a tap. Cream edge on navy (a black edge on
 * navy measures 1.23:1), cream label — nothing tone-on-tone.
 */

'use client';

import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Radio, Loader2, Shuffle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { teacherGameMode } from '@/lib/education/gameModes';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { ModePickerStrip } from '../modePicker/ModePickerStrip';
import { useClassroomModeSwitch } from './useClassroomModeSwitch';

export interface LobbyModeSwitcherProps {
  gameCode: string;
  /** What the room is playing, by the caller's own source precedence. */
  currentMode: ClassroomGameMode;
  socket: Socket | null;
}

export function LobbyModeSwitcher({ gameCode, currentMode, socket }: LobbyModeSwitcherProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { liveMode, pendingMode, switchTo } = useClassroomModeSwitch({
    gameCode,
    currentMode,
    socket,
    t,
  });
  const live = teacherGameMode(liveMode);

  return (
    <div
      data-testid="lobby-mode-switcher"
      className="w-full border-b-[3px] border-neo-cream bg-neo-navy px-3 py-2"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cream">
          <Radio className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('education.modePicker.playing')}
          <span className="rounded-neo border-[2px] border-black bg-neo-cream px-1.5 py-0.5 text-black">
            {t(live?.nameKey ?? 'teacher.classroom.gameModes.classic')}
          </span>
        </span>

        <button
          type="button"
          data-testid="lobby-change-mode"
          aria-expanded={open}
          disabled={!!pendingMode}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex min-h-10 items-center gap-1.5 rounded-neo border-[2px] border-neo-cream bg-neo-navy-light px-3 py-1.5',
            'font-neo-display text-xs font-black uppercase leading-tight text-neo-cream',
            'transition-colors hover:bg-neo-navy',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
            'disabled:cursor-wait disabled:opacity-70'
          )}
        >
          {pendingMode ? (
            <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Shuffle className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          )}
          {t('education.modePicker.change')}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-xl">
          <ModePickerStrip
            selected={liveMode}
            recommended={null}
            busy={!!pendingMode}
            onPick={(mode) => {
              switchTo(mode);
              setOpen(false);
            }}
          />
          {/* Said before the tap, because a teacher's real fear here is losing
              the students who already typed the code. */}
          <p className="mt-1.5 text-center font-neo-body text-[0.7rem] font-bold text-neo-cream">
            {t('education.modePicker.sameCode')}
          </p>
        </div>
      )}
    </div>
  );
}

export default LobbyModeSwitcher;
