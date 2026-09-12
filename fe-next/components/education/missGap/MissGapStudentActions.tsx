/**
 * Student action block — due banner, turn-in, and the one button that plays.
 *
 * The homework IS the game now: there is no self-marked checkbox, the run
 * itself is what gets recorded server-side.
 *
 * Before the run, PLAY is the only thing on the screen. After it, the turn-in
 * takes the primary slot and PLAY AGAIN drops to a quiet bordered control —
 * two full-width lime buttons meant neither of them read as the next thing to
 * do (decision-fatigue rule: exactly one dominant action).
 *
 * `turnIn` arrives as a node rather than being built here: the same element is
 * also handed to the game's finish screen, and rendering it twice would collide
 * on its test ids. The `!playing` guard upstream is what keeps it single.
 *
 * ONE root element with the classes it had inline — this sits inside the
 * compose `<section>` whose `space-y` rhythm the 390x844 fold budget assumes.
 */
'use client';

import type { ReactNode } from 'react';
import { ClipboardList, Play, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

export interface MissGapStudentActionsProps {
  payload: MissGapAssignmentPayload;
  completed: boolean;
  playing: boolean;
  turnIn: ReactNode;
  onPlay: () => void;
}

export function MissGapStudentActions({
  payload,
  completed,
  playing,
  turnIn,
  onPlay,
}: MissGapStudentActionsProps) {
  const { t } = useLanguage();
  const words = payload.missedWords;

  return (
    <div className="mt-5 space-y-3">
      <p
        className="flex items-center gap-2 text-neo-cream font-bold text-sm"
        data-testid="miss-gap-async-due-banner"
      >
        <ClipboardList className="w-4 h-4" aria-hidden />
        {t('education.results.assignMissGapAsyncDueBanner', { due: payload.dueDate })}
      </p>
      {!playing && completed ? turnIn : null}
      <button
        type="button"
        data-testid="miss-gap-async-complete"
        onClick={onPlay}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4',
          'font-neo-display font-bold border-[3px] rounded-neo transition-all',
          completed
            ? 'py-2.5 text-sm bg-neo-navy text-neo-cream border-neo-cream'
            : 'py-4 text-lg bg-neo-lime text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg',
        )}
      >
        {completed ? (
          <RotateCcw className="w-5 h-5" aria-hidden />
        ) : (
          <Play className="w-5 h-5" aria-hidden />
        )}
        {completed
          ? t('education.homework.playAgainCta')
          : t('education.homework.startCta', { count: words.length })}
      </button>
    </div>
  );
}
