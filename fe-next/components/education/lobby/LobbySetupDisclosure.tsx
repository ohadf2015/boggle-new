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
import { ChevronDown, ChevronUp, School, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface LobbySetupDisclosureProps {
  classroomName: string;
  lessonNames: string[];
  wordCount: number;
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
  incomplete,
  open,
  onToggle,
  children,
}: LobbySetupDisclosureProps) {
  const { t } = useLanguage();

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
          'flex w-full items-center gap-2 rounded-neo border-[2px] px-3 py-2.5 text-start',
          'font-neo-body text-sm font-bold transition-colors',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          incomplete
            ? 'border-neo-pink bg-neo-navy-light text-neo-white hover:bg-neo-navy'
            : 'border-neo-cream bg-neo-navy-light text-neo-cream hover:bg-neo-navy'
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
        <span className="shrink-0 font-neo-display text-[0.65rem] font-black uppercase tracking-wide">
          {t(open ? 'education.modePicker.settingsHide' : 'education.modePicker.settings')}
        </span>
        {open ? (
          <ChevronUp className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div data-testid="lobby-setup-body" className="space-y-5">
          {children}
        </div>
      )}
    </div>
  );
}

export default LobbySetupDisclosure;
