'use client';

/**
 * PracticePicker — one word list, many games.
 *
 * What changed, and why. The picker was first a wall of thirteen cream cards,
 * each with a title, a sentence about the skill it drills, a count badge and a
 * play count — roughly two and a half phone screens of reading before a student
 * could choose. That became an art-led poster grid, which fixed the reading but
 * not the arithmetic: fourteen posters is still fourteen decisions, and the
 * screen still recommended nothing.
 *
 * So the grid is now ranked. One practice is promoted to a hero poster with a
 * single PLAY on it — one tap and the round starts. Three more sit beside it.
 * Everything else, including every skill the lesson has not unlocked yet, waits
 * behind one "more games" disclosure. A student who wants the default never sees
 * the other ten; a student who wants the antonym drill is two taps from it.
 *
 * Locked tiles still exist, they are just no longer the first thing a twelve
 * year old reads: "add synonyms to unlock" is how a student learns the lesson
 * has more in it, and how a teacher learns what to fill in — but it is a
 * footnote, not an opening argument.
 *
 * The header lost the readiness count and the mastery badge. Both were header
 * stats competing with the thing the screen is for, the readiness number now
 * lives on the disclosure that actually acts on it, and the XP bar above the
 * picker already reports level and progress.
 *
 * The shell also stops the page scrolling: header is fixed height, the content
 * column is the single scrolling region.
 *
 * The readiness model stays pure in `lib/education/practicePicker`; the ranking
 * that chooses the hero is pure in `lib/education/practiceShortlist`.
 */

import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
import { practiceShortlist } from '@/lib/education/practiceShortlist';
import PracticePickerTile from './PracticePickerTile';
import PracticePickerHero from './PracticePickerHero';

export interface PracticePickerProps {
  lessonName: string;
  words: VocabularyWord[];
  /** Lesson language — decides whether built-in distractor banks apply. */
  language?: string;
  /** Kept for callers; the badge itself moved off this screen. */
  mastery?: MasteryLevel;
  /** Finished-session totals: they rank the recommendation and fill the tiles. */
  sessions?: PracticeSessionCounts | null;
  onSelectMode: (
    mode: PracticeType,
    options?: { focus?: VocabFocus; variant?: PracticeVariant }
  ) => void;
  /**
   * Kept for callers. The picker no longer draws a back control: the education
   * shell's header already carries one directly above this screen, and two
   * identical arrows 60px apart is chrome pretending to be a choice.
   */
  onBack?: () => void;
}

export default function PracticePicker({
  lessonName,
  words,
  language,
  sessions,
  onSelectMode,
}: PracticePickerProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const tiles = useMemo(
    () => buildPracticeTiles(words, { language, sessions }),
    [words, language, sessions]
  );
  const readiness = useMemo(() => practiceReadiness(tiles), [tiles]);
  const shortlist = useMemo(() => practiceShortlist(tiles), [tiles]);

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
      {/* Header: ONE line. The lesson's name is the page title in the bar above
          this (see the route's PageClient), so repeating it here spent a second
          row of a 390x844 phone on the same six words. */}
      <h1 className="shrink-0 pb-2 font-neo-display text-lg font-black uppercase leading-none text-neo-white text-balance">
        {t('education.practicePicker.title')}
      </h1>

      {/* The one scrolling region on this screen. The shell above and the page
          around it stay put, so the phone never scrolls the body. */}
      <div
        data-testid="practice-picker-grid"
        role="group"
        aria-label={lessonName}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-2"
      >
        {shortlist.recommended && (
          <PracticePickerHero tile={shortlist.recommended} onSelect={handleSelect} />
        )}

        {shortlist.alsoReady.length > 0 && (
          <div
            data-testid="practice-picker-shortlist"
            className="grid grid-cols-3 gap-2.5 sm:gap-3"
          >
            {shortlist.alsoReady.map((tile) => (
              <PracticePickerTile key={tile.id} tile={tile} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {shortlist.rest.length > 0 && (
          <>
            <button
              type="button"
              data-testid="practice-picker-more"
              aria-expanded={showAll}
              onClick={() => setShowAll((open) => !open)}
              className="flex min-h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy px-4 font-neo-display text-sm font-black uppercase text-neo-cream transition-colors hover:bg-neo-navy-light"
            >
              {showAll
                ? t('student.practiceFun.fewerGames')
                : t('student.practiceFun.moreGames', { count: shortlist.rest.length })}
              {showAll ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {showAll && (
              <div
                data-testid="practice-picker-rest"
                className="grid grid-cols-2 content-start gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
              >
                {shortlist.rest.map((tile) => (
                  <PracticePickerTile key={tile.id} tile={tile} onSelect={handleSelect} />
                ))}
              </div>
            )}
          </>
        )}

        {readiness.ready === 0 && (
          <p role="status" className="shrink-0 font-neo-body text-sm text-neo-cream text-pretty">
            {t('education.practicePicker.nothingReady')}
          </p>
        )}
      </div>
    </div>
  );
}
