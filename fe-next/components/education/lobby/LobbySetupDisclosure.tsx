/**
 * Class, word list and round settings — behind ONE closed door.
 *
 * Round 1 left all of it open under the picker: a classroom row, a lesson
 * list, three ritual presets, a timer grid, a board-size grid and the quiz
 * shape. Kahoot's eight host toggles are the anti-reference for that, and it is
 * also most of the 740px of page scroll the critic measured. Every one of those
 * values already has a sensible default, so none of them is a question a
 * teacher has to answer to play.
 *
 * The button is also the screen's ONE status row: it says which class, which
 * list and how many words are loaded, so the teacher can confirm at a glance
 * and never open it. When something is genuinely missing it becomes the one
 * thing to do, rather than a greyed CTA with a banner over it.
 */

'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown, School, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BoardLanguageChip } from '../pickers/BoardLanguageChip';

export interface LobbySetupDisclosureProps {
  classroomName: string;
  lessonNames: string[];
  wordCount: number;
  /** What launch sends as the board language; null until a list is picked. */
  boardLanguage?: string | null;
  /** True while GO LIVE cannot fire — the summary becomes the call to action. */
  incomplete: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function LobbySetupDisclosure({
  classroomName,
  lessonNames,
  wordCount,
  boardLanguage,
  incomplete,
  open,
  onToggle,
  children,
}: LobbySetupDisclosureProps) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const summary = incomplete
    ? t('education.modePicker.needsLesson')
    : [
        classroomName,
        lessonNames.join(', '),
        t('education.classroomGame.words', { count: wordCount }),
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <div className="space-y-3">
      <button
        type="button"
        data-testid="lobby-setup-summary"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          // Secondary to GO LIVE: thin, small, a half-lit edge. Only the
          // blocked state gets a full-strength (pink) edge, because then it IS
          // the one thing to do.
          'flex w-full items-center gap-2 rounded-neo border-[2px] px-3 py-2 text-start',
          'font-neo-body text-sm font-bold transition-colors lg:text-base',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          incomplete
            ? 'border-neo-pink bg-neo-navy-light text-neo-white hover:bg-neo-navy'
            : 'border-neo-cream/45 bg-neo-navy/80 text-neo-cream/85 hover:bg-neo-navy hover:text-neo-cream'
        )}
      >
        {incomplete ? (
          <TriangleAlert className="size-4 shrink-0 text-neo-pink" strokeWidth={3} aria-hidden="true" />
        ) : (
          <School className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        )}
        {/* One row, two jobs: the room's summary when everything is ready, and
            the single thing to do when it is not. A separate alert above the
            primary action would be the stacked-banner the addendum forbids. */}
        <span
          {...(incomplete ? { 'data-testid': 'mode-picker-blocked', role: 'alert' } : {})}
          className="min-w-0 flex-1 truncate"
        >
          {summary}
        </span>
        {boardLanguage && !incomplete && <span className="contents max-sm:hidden"><BoardLanguageChip language={boardLanguage} /></span>}
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-black px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm',
            open ? 'bg-neo-lime' : 'bg-neo-cyan'
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={3} aria-hidden="true" />
          {t(open ? 'eduShell.host.optionsHide' : 'eduShell.host.options')}
          <ChevronDown
            className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
            strokeWidth={3}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <m.div
          data-testid="lobby-setup-body"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="space-y-5"
        >
          {children}
        </m.div>
      )}
    </div>
  );
}

export default LobbySetupDisclosure;
