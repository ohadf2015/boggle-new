/**
 * The alternatives, and only the alternatives.
 *
 * The mode a teacher is about to play is the hero above this; this is the list
 * of the other four, and it exists only while the fold is open. Blooket shows
 * eighteen equal logos and hands the ranking back to the teacher; the bar
 * (design card `education/03-mode-tiles`) shows one and hides the rest, so a
 * teacher who agrees with the recommendation reads one poster, not five.
 *
 * A fixed grid, never a scroller: four neutral tiles fit one row from `sm` up
 * and two rows on a 390px phone, so nothing inside the locked shell needs its
 * own scrollbar and nothing is hidden off the edge of a row.
 */

'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TEACHER_GAME_MODES, type TeacherGameMode } from '@/lib/education/gameModes';
import { ModePosterTile } from './ModePosterTile';

export interface ModePickerStripProps {
  /** The mode the next room will use — excluded from the list below it. */
  selected: TeacherGameMode['id'] | null;
  /** The mode these words suit, or null when there is nothing to go on. */
  recommended: TeacherGameMode['id'] | null;
  /** A room is on the wire already — the tiles stop taking taps. */
  busy?: boolean;
  onPick: (id: TeacherGameMode['id']) => void;
  className?: string;
}

export function ModePickerStrip({
  selected,
  recommended,
  busy,
  onPick,
  className,
}: ModePickerStripProps) {
  const { t } = useLanguage();

  /**
   * Everything except the hero. Listing the hero again would put the same
   * poster on screen twice and make "which one am I playing" a question.
   */
  const alternates = useMemo(
    () => TEACHER_GAME_MODES.filter((m) => m.id !== selected),
    [selected]
  );

  return (
    <div
      role="radiogroup"
      aria-label={t('education.modePicker.sheetTitle')}
      data-testid="mode-picker-track"
      // Two up on a 390px phone so the names are readable rather than
      // truncated to "WHEEL R…"; one row of four from `sm`.
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}
    >
      {alternates.map((mode) => (
        <ModePosterTile
          key={mode.id}
          mode={mode}
          size="compact"
          selected={false}
          recommended={recommended === mode.id}
          busy={busy}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

export default ModePickerStrip;
