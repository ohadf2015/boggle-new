/**
 * "We're playing X." — and the chip that says so is the control that changes it.
 *
 * The gap this closes, reproduced by a blind critic: once GO LIVE had fired,
 * changing the game meant EXITING, which ends the room for every student
 * already in it, and coming back with a different code the class has to
 * retype. A teacher reads a room in the first ten seconds; the product has to
 * let them act on that without charging the class its seats.
 *
 * WHY IT LIVES IN THE PROJECTOR'S SETTINGS ROW. `ProjectorLobby` is
 * `fixed inset-0 z-[65]` — in the lobby it IS the teacher's screen, and
 * anything rendered in normal flow (the education header, the classroom
 * banner) is behind it and unreachable. Measured live 2026-09-11: a strip
 * rendered by `ClassroomModeBanner` sat at y=92 with the projector painted
 * over it. So the control goes where the teacher already looks for the answer
 * — the fact chip that names the game — and that chip becomes the button.
 *
 * The sheet is a real overlay (z-[80]) rather than an inline expander: the
 * projector's footer has no spare height at 390×844, and a row that grew would
 * push START off a locked screen.
 *
 * Contrast: solid navy-light fill, 2px cream edge, cream label — the
 * surrounding chips are `border-neo-cream/25`, which is not enough edge to
 * read as a control, and this one has to.
 */

'use client';

import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Shuffle, Loader2, X } from 'lucide-react';
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
  /**
   * Translator, passed in rather than read from context: `ProjectorLobby` is
   * translated through a `t` PROP, and a component inside it that reached for
   * `useLanguage` rendered real English beside siblings rendering keys.
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * Fired with the SERVER-confirmed mode. The surrounding surface has its own
   * copies of "what are we playing" — the settings chips, the start-button
   * copy — fed from the teacher's `lessonGameData`, which is React state read
   * once at mount and cannot see a sessionStorage write. Without this the chip
   * said BLAST while the row beside it still offered "10 · Questions" and the
   * button still said START QUIZ (measured live 2026-09-11). Both mirrors are
   * written from the same ack, in the same tick, so they cannot disagree.
   */
  onModeApplied?: (mode: ClassroomGameMode) => void;
}

export function LobbyModeSwitcher({
  gameCode,
  currentMode,
  socket,
  t,
  onModeApplied,
}: LobbyModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { liveMode, pendingMode, switchTo } = useClassroomModeSwitch({
    gameCode,
    currentMode,
    socket,
    t,
    onApplied: onModeApplied,
  });
  const live = teacherGameMode(liveMode);
  const liveName = t(live?.nameKey ?? 'teacher.classroom.gameModes.classic');

  return (
    <span data-testid="lobby-mode-switcher" className="contents">
      <button
        type="button"
        data-testid="lobby-change-mode"
        aria-expanded={open}
        aria-label={t('education.modePicker.change')}
        disabled={!!pendingMode}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-neo border-[2px] border-neo-cream bg-neo-navy-light',
          // PHONE FIRST. Every sibling chip in this footer is sized in `vw`,
          // which is right on a projector and 10px in a 22px-tall box on the
          // 390px phone the teacher actually holds (measured 2026-09-11:
          // 56x22, font 10.14px). This one is a control, so it gets a 44px
          // target and 15px body text; `vw` returns only from `md` up, where
          // the wall is the audience again.
          'px-3 py-2 font-neo-body text-[15px] font-bold text-neo-cream',
          'md:min-h-0 md:px-[1vw] md:py-[0.4vw] md:text-[1vw]',
          'transition-colors hover:bg-neo-navy',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
          'disabled:cursor-wait disabled:opacity-70'
        )}
      >
        {pendingMode ? (
          <Loader2 className="h-[1em] w-[1em] shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Shuffle className="h-[1em] w-[1em] shrink-0" strokeWidth={3} aria-hidden="true" />
        )}
        {liveName}
      </button>

      {open && (
        <div
          data-testid="lobby-mode-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t('education.modePicker.sheetTitle')}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-neo-navy/90 p-4"
        >
          <div className="w-full max-w-md rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-4 shadow-hard-lg">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="font-neo-display text-base font-black uppercase leading-tight text-neo-cream">
                {t('education.modePicker.sheetTitle')}
              </h2>
              <button
                type="button"
                data-testid="lobby-mode-sheet-close"
                onClick={() => setOpen(false)}
                aria-label={t('education.modePicker.close')}
                className="shrink-0 rounded-neo border-[2px] border-neo-cream bg-neo-navy p-1.5 text-neo-cream transition-colors hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
              >
                <X className="size-4" strokeWidth={3} aria-hidden="true" />
              </button>
            </div>
            {/* Said BEFORE the tap, because the teacher's real fear here is
                losing the students who have already typed the code. */}
            <p className="mb-3 font-neo-body text-xs font-bold leading-snug text-neo-cream">
              {t('education.modePicker.sameCode')}
            </p>

            <ModePickerStrip
              selected={liveMode}
              recommended={null}
              busy={!!pendingMode}
              onPick={(mode) => {
                switchTo(mode);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </span>
  );
}

export default LobbyModeSwitcher;
