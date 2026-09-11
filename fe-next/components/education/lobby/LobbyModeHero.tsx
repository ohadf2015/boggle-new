/**
 * The whole decision, pinned: one poster, one button.
 *
 * Round 1 pinned FIVE posters and left GO LIVE greyed until the teacher chose a
 * word list — five choices before a class could play, on a page that scrolled
 * 1640px at 1440×900 to hold them. The bar (design card
 * `education/03-mode-tiles`) is one large recommended tile, one primary action,
 * and the four alternatives folded away behind "More modes".
 *
 * ONE ACCENT. The hero carries the mode's colour; the fold's tiles are neutral
 * and GO LIVE is lime, so at most two colours are ever lit. Nothing here is
 * tone-on-tone: GO LIVE is a solid lime fill with black label and black edge,
 * "More modes" is cream text on a 2px cream edge, and the blocked sentence sits
 * on a solid navy-light card with a pink edge — never a 20% tint.
 *
 * ONE STATUS LINE. The old subtitle, the "PLAYING NOW <mode>" chip and the
 * recommendation hint all said the same thing three times, and the hint was
 * computed from the RECOMMENDED mode while the poster showed the SELECTED one —
 * the stale line a blind critic caught. Everything this panel says now comes
 * off `selected`, so the two cannot disagree.
 */

'use client';

import { Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TEACHER_GAME_MODES, teacherGameMode, type TeacherGameMode } from '@/lib/education/gameModes';
import { ModePickerStrip } from '../modePicker/ModePickerStrip';
import { ModePosterTile } from '../modePicker/ModePosterTile';

export interface LobbyModeHeroProps {
  selected: TeacherGameMode['id'];
  recommended: TeacherGameMode['id'] | null;
  busy?: boolean;
  /**
   * Set while GO LIVE cannot fire. It only DISABLES here — the sentence saying
   * why is the setup row's own label, so the screen never stacks a banner over
   * a prompt (addendum: at most one status row, zero stacked prompts).
   */
  blockedKey: string | null;
  /** The fold's state lives with the lobby so a launch can close it. */
  expanded: boolean;
  onToggleExpanded: () => void;
  onPick: (id: TeacherGameMode['id']) => void;
  onGoLive: () => void;
}

export function LobbyModeHero({
  selected,
  recommended,
  busy,
  blockedKey,
  expanded,
  onToggleExpanded,
  onPick,
  onGoLive,
}: LobbyModeHeroProps) {
  const { t } = useLanguage();
  const live = teacherGameMode(selected) ?? TEACHER_GAME_MODES[0];
  const alternateCount = TEACHER_GAME_MODES.length - 1;

  return (
    <section
      data-testid="lobby-go-live-panel"
      className="border-b-[3px] border-neo-cream bg-neo-navy px-1 pb-2.5 pt-1"
    >
      <ModePosterTile
        mode={live}
        size="hero"
        selected
        recommended={recommended === live.id}
        busy={busy}
        expanded={expanded}
        onPick={onPick}
        onOpenPicker={onToggleExpanded}
      />

      {/* Stacked on a phone so GO LIVE gets the full width and stays one line;
          side by side from `sm`, where there is room for both. */}
      <div className="mt-2.5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {/* The screen's ONE primary action. It names the game it is about to
            start, so the poster above can be swapped without ever re-reading
            this button. Black label on lime: cream on lime measures 1.2:1. */}
        <button
          type="button"
          data-testid="lobby-go-live"
          onClick={onGoLive}
          disabled={!!blockedKey || busy}
          className={cn(
            'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-neo border-[3px] border-black px-4 py-2',
            'bg-neo-lime font-neo-display text-base font-black uppercase tracking-tight text-black shadow-hard',
            'transition-all motion-safe:hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
            'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-hard'
          )}
        >
          <Radio className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('education.modePicker.launch', { mode: t(live.nameKey) })}
        </button>

        {/* Secondary: the 2px cream edge carries the contrast on navy, so this
            is a control at a glance without being a second loud fill. */}
        <button
          type="button"
          data-testid="more-modes-toggle"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          className={cn(
            'flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-neo border-[2px] border-neo-cream bg-neo-navy-light px-3 py-2',
            'font-neo-display text-xs font-black uppercase leading-tight text-neo-cream',
            'transition-colors hover:bg-neo-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
          )}
        >
          {t(expanded ? 'education.modePicker.fewerModes' : 'education.modePicker.moreModes', {
            count: alternateCount,
          })}
          {expanded ? (
            <ChevronUp className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <ModePickerStrip
          className="mt-2"
          selected={selected}
          recommended={recommended}
          busy={busy}
          onPick={onPick}
        />
      )}

    </section>
  );
}

export default LobbyModeHero;
