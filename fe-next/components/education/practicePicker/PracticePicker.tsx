'use client';

/**
 * PracticePicker — one word list, many games.
 *
 * A poster per practice type the lesson can drive. Locked tiles stay on the
 * board on purpose: "add synonyms to unlock" is how a student sees the lesson
 * has more in it, and how a teacher learns what to fill in.
 *
 * What changed, and why: the picker used to be thirteen near-identical cream
 * cards, each carrying a title, a full sentence about the skill it drills, a
 * count badge and a play count. On a 390x844 phone that is roughly two and a
 * half screens of reading before a student can choose, and the thing that
 * actually distinguishes the modes — what they *are*, and what they pay — was
 * the part that got cut off. The grid is now art-led: a picture, a name, and
 * one meta line carrying the XP rate and the material count.
 *
 * The shell also stops the page scrolling. The header and readiness line are
 * fixed height; the grid is the single scrolling region, which is the pattern
 * the rest of the education module is converging on.
 *
 * The readiness model stays pure and lives in `lib/education/practicePicker`.
 */

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ArrowLeft, CheckCircle, Clock, Target } from 'lucide-react';
import type { PracticeType, MasteryLevel } from '@/hooks/usePracticeSession';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { VocabFocus } from '@/lib/education/vocabFocus';
import {
  buildPracticeTiles,
  practiceReadiness,
  type PracticeSessionCounts,
  type PracticeTile,
  type PracticeVariant,
} from '@/lib/education/practicePicker';
import PracticePickerTile from './PracticePickerTile';

export interface PracticePickerProps {
  lessonName: string;
  words: VocabularyWord[];
  /** Lesson language — decides whether built-in distractor banks apply. */
  language?: string;
  /** The student's mastery of this lesson, shown beside the readiness line. */
  mastery?: MasteryLevel;
  /** Finished-session totals, so each tile can show what has been played. */
  sessions?: PracticeSessionCounts | null;
  onSelectMode: (
    mode: PracticeType,
    options?: { focus?: VocabFocus; variant?: PracticeVariant }
  ) => void;
  onBack: () => void;
}

/** Mastery badge, carried over from the mode selector this picker replaced. */
const MASTERY_LOOK: Record<string, { icon: typeof CheckCircle; className: string }> = {
  mastered: { icon: CheckCircle, className: 'text-neo-cyan' },
  practicing: { icon: Clock, className: 'text-neo-yellow' },
  started: { icon: Target, className: 'text-neo-orange' },
};

export default function PracticePicker({
  lessonName,
  words,
  language,
  mastery,
  sessions,
  onSelectMode,
  onBack,
}: PracticePickerProps) {
  const { t } = useLanguage();
  const tiles = useMemo(
    () => buildPracticeTiles(words, { language, sessions }),
    [words, language, sessions]
  );
  const readiness = useMemo(() => practiceReadiness(tiles), [tiles]);
  const masteryLook = mastery && mastery !== 'not_started' ? MASTERY_LOOK[mastery] : undefined;
  const MasteryIcon = masteryLook?.icon;

  const handleSelect = (tile: PracticeTile) => {
    // Word Tower shares `solo_board` as its practice type, so the variant is
    // what keeps it from opening the plain board.
    const options =
      tile.focus || tile.variant
        ? {
            ...(tile.focus ? { focus: tile.focus } : {}),
            ...(tile.variant ? { variant: tile.variant } : {}),
          }
        : undefined;
    onSelectMode(tile.mode, options);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/*
        Header: ONE row, and the readiness/mastery meta rides in it rather than
        on a line of its own. Every row up here is a row of tiles a student on a
        390x844 phone does not get to see.
      */}
      <div className="flex shrink-0 items-center gap-2 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label={t('common.back')}
          className="shrink-0 text-neo-cream hover:bg-neo-white/10 hover:text-neo-white"
        >
          <DirectionalIcon icon={ArrowLeft} className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-neo-display text-lg font-black uppercase leading-none text-neo-white text-balance">
            {t('education.practicePicker.title')}
          </h1>
          <p className="truncate font-neo-body text-[11px] leading-tight text-neo-white/70">
            {lessonName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p
            data-testid="practice-picker-readiness"
            className="font-neo-body text-[11px] tabular-nums text-neo-white/65"
          >
            {t('education.practicePicker.readyCount', {
              ready: readiness.ready,
              total: readiness.total,
            })}
          </p>
          {masteryLook && MasteryIcon && (
            <p
              data-testid="practice-picker-mastery"
              className={cn(
                'flex items-center gap-1 font-neo-body text-[11px] font-bold',
                masteryLook.className
              )}
            >
              <MasteryIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(`education.practice.mastery.${mastery}`)}
            </p>
          )}
        </div>
      </div>

      {/*
        The one scrolling region on this screen. The shell above and the page
        around it stay put, so the phone never scrolls the body.
      */}
      <div
        data-testid="practice-picker-grid"
        className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-contain pb-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {tiles.map((tile) => (
          <PracticePickerTile key={tile.id} tile={tile} onSelect={handleSelect} />
        ))}
      </div>

      {readiness.ready === 0 && (
        <p
          role="status"
          className="shrink-0 pt-3 font-neo-body text-sm text-neo-white/80 text-pretty"
        >
          {t('education.practicePicker.nothingReady')}
        </p>
      )}
    </div>
  );
}
