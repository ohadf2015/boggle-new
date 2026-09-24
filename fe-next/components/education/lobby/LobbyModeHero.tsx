/**
 * The launch decision, pinned: a row of big illustrated mode cards, one lit
 * GO LIVE.
 *
 * Round 2 (2026-09-24): the single poster left the top 40% of a phone as empty
 * starfield and hid four of five games. Now the three most-played modes
 * (vocab-quiz 15 plays, classic 10, blast 3 — PostHog 60d) are big selectable
 * cards with their storybook node art; the other two fold behind a quiet
 * "More games" link. A card tap only SELECTS; GO LIVE is still the screen's
 * one primary action and names the selected mode, so the two can never
 * disagree (Pitfall Class 3). One status line — the selected mode's mechanic —
 * sits between them.
 */

'use client';

import { Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TEACHER_GAME_MODES, teacherGameMode, type TeacherGameMode } from '@/lib/education/gameModes';
import { LobbyModeCard } from './LobbyModeCard';
import { modeCardFacts, visibleModeIds, type LaunchRoundFacts } from './lobbyModeCards';

export interface LobbyModeHeroProps {
  selected: TeacherGameMode['id'];
  recommended: TeacherGameMode['id'] | null;
  busy?: boolean;
  /**
   * The round length this lobby is actually configured for. Passed down so the
   * poster's minute chip and the round settings below it can never disagree —
   * the catalog number is only a fallback for a mode nobody has tuned yet.
   */
  minutes?: number;
  /** The lobby's live settings, for each card's fact chips (never a per-mode guess). */
  roundFacts?: LaunchRoundFacts;
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
  minutes,
  roundFacts,
  blockedKey,
  expanded,
  onToggleExpanded,
  onPick,
  onGoLive,
}: LobbyModeHeroProps) {
  const { t } = useLanguage();
  const live = teacherGameMode(selected) ?? TEACHER_GAME_MODES[0];
  const catalog = TEACHER_GAME_MODES.map((m) => m.id);
  const shown = visibleModeIds(catalog, live.id, expanded)
    .map((id) => teacherGameMode(id))
    .filter((m): m is TeacherGameMode => !!m);
  const foldedCount = TEACHER_GAME_MODES.length - visibleModeIds(catalog, live.id, false).length;

  return (
    <section
      data-testid="lobby-go-live-panel"
      className="rounded-neo-lg border-4 border-neo-cream bg-neo-navy/90 p-2.5 shadow-hard-lg lg:p-4"
    >
      <div
        role="radiogroup"
        aria-label={t('education.modePicker.change')}
        className={cn(
          'grid gap-2.5 pt-2 lg:gap-4',
          shown.length > 3 ? 'grid-cols-3 lg:grid-cols-5' : 'grid-cols-3'
        )}
      >
        {shown.map((mode) => (
          <LobbyModeCard
            key={mode.id}
            mode={mode}
            selected={mode.id === live.id}
            recommended={recommended === mode.id}
            minutes={mode.id === live.id ? (minutes ?? mode.minutes) : mode.minutes}
            busy={busy}
            facts={roundFacts ? modeCardFacts(mode.id, roundFacts) : undefined}
            onPick={onPick}
          />
        ))}
      </div>

      {/* The ONE status line: what the selected game is, off the same prop the
          card and GO LIVE read. */}
      <p
        data-testid="lobby-selected-how"
        className="mt-2 line-clamp-2 text-center font-neo-body text-xs font-bold leading-snug text-neo-cream/90 lg:mt-3 lg:text-lg"
      >
        {t(live.howKey)}
      </p>

      {/* The screen's ONE primary action. It names the game it is about to
          start. Black label on lime: cream on lime measures 1.2:1. */}
      <button
        type="button"
        data-testid="lobby-go-live"
        onClick={onGoLive}
        disabled={!!blockedKey || busy}
        className={cn(
          'mt-2 flex min-h-16 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-black px-4 py-2 lg:mt-3 lg:min-h-20',
          'bg-neo-lime font-neo-display text-xl font-black uppercase tracking-tight text-black shadow-hard-lg lg:text-4xl',
          'transition-all motion-safe:hover:-translate-y-0.5 hover:shadow-hard-xl active:translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-hard'
        )}
      >
        <Radio className="size-6 shrink-0 lg:size-8" strokeWidth={3} aria-hidden="true" />
        <span className="truncate">{t('education.modePicker.launch', { mode: t(live.nameKey) })}</span>
      </button>

      {/* Secondary: a quiet text link, never a second button-sized fill. */}
      {foldedCount > 0 && (
        <button
          type="button"
          data-testid="more-modes-toggle"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          className={cn(
            'mx-auto mt-1.5 flex items-center justify-center gap-1 rounded-neo px-2 py-1 lg:mt-2',
            'font-neo-display text-xs font-black uppercase leading-tight text-neo-cream/85 underline decoration-2 underline-offset-4 lg:text-sm',
            'hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream'
          )}
        >
          {t(expanded ? 'education.modePicker.fewerModes' : 'education.modePicker.moreModes', {
            count: foldedCount,
          })}
          {expanded ? (
            <ChevronUp className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          )}
        </button>
      )}
    </section>
  );
}

export default LobbyModeHero;
