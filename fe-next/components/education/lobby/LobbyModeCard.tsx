/**
 * One big illustrated mode card on the teacher's launch screen.
 *
 * Tapping SELECTS (never launches — GO LIVE is the one launch control). The
 * selected card fills with the mode's accent, lifts and gets a check, so from
 * across the room it is obvious which game GO LIVE will start. Storybook node
 * art (node-quiz / node-arena / node-wordcraft) instead of a flat icon.
 * Transform-only feedback, `motion-safe:` only; nothing fades in (Class 5).
 */

'use client';

import { Check, Clock, Gauge, Grid3x3, HelpCircle, Type, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ModeAccent, TeacherGameMode } from '@/lib/education/gameModes';
import { modeCardArt, type ModeFactChip } from './lobbyModeCards';
import { tr } from './eduText';

/** Whole literal classes — Tailwind v4 only emits what it can read verbatim. */
const SELECTED_FILL: Record<ModeAccent, string> = {
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

const ACCENT_STRIPE: Record<ModeAccent, string> = {
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

/**
 * Held apart so neither state inherits the other's edge: selected = the
 * accent fill with a black edge; idle = navy with a cream edge.
 */
const CARD_SELECTED = 'z-10 -translate-y-1 border-[3px] border-neo-black text-neo-black shadow-hard-lg';
const CARD_IDLE =
  'border-[3px] border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard motion-safe:hover:-translate-y-0.5';

export interface LobbyModeCardProps {
  mode: TeacherGameMode;
  selected: boolean;
  recommended: boolean;
  /** Minutes to print: the configured round for the selected card, else the catalog's. */
  minutes: number;
  busy?: boolean;
  /** Question count / pace, or grid / min letters — from the lobby's settings. */
  facts?: ModeFactChip[];
  onPick: (id: TeacherGameMode['id']) => void;
}

const FACT_ICON = {
  questions: HelpCircle,
  pace: Gauge,
  board: Grid3x3,
  letters: Type,
} as const;

export function LobbyModeCard({ mode, selected, recommended, minutes, busy, facts = [], onPick }: LobbyModeCardProps) {
  const { t } = useLanguage();
  const chip = cn(
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border-[2px] px-1.5 py-0.5 font-neo-display text-[0.62rem] font-black uppercase leading-none lg:px-2 lg:text-sm',
    selected ? 'border-neo-black bg-neo-cream text-neo-black' : 'border-neo-cream text-neo-cream'
  );
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`mode-tile-${mode.id}`}
      data-size="card"
      data-selected={selected ? 'true' : 'false'}
      disabled={busy}
      onClick={() => {
        if (busy || selected) return;
        onPick(mode.id);
      }}
      className={cn(
        'relative flex min-w-0 flex-col items-center gap-1 rounded-neo-lg p-1.5 pb-2 text-center lg:gap-2 lg:p-3',
        'transition-[transform,box-shadow] duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        'motion-safe:active:scale-95 disabled:cursor-wait',
        selected ? cn(CARD_SELECTED, SELECTED_FILL[mode.accent]) : CARD_IDLE
      )}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute -end-2 -top-2 z-10 grid size-7 place-items-center rounded-full border-[3px] border-neo-black bg-neo-lime shadow-hard-sm lg:size-9"
        >
          <Check className="size-4 text-neo-black lg:size-5" strokeWidth={4} />
        </span>
      )}

      {/* The art sits on a dark stage so the storybook colours stay true. */}
      <span className="relative grid w-full place-items-center overflow-hidden rounded-neo border-[2px] border-neo-cream bg-neo-navy">
        <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 h-1.5', ACCENT_STRIPE[mode.accent])} />
        {/* eslint-disable-next-line @next/next/no-img-element -- 512px transparent node art, same file the academy map uses */}
        <img
          src={modeCardArt(mode.id)}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className={cn(
            'pointer-events-none aspect-square w-[78%] max-w-40 select-none object-contain py-1',
            selected && 'motion-safe:animate-avatar-float'
          )}
        />
      </span>

      <span className="line-clamp-2 min-h-[2.2em] w-full font-neo-display text-[0.8rem] font-black uppercase leading-[1.1] sm:text-sm lg:text-xl">
        {t(mode.nameKey)}
      </span>

      {/* The facts a teacher picks by, in one glance: length, then the
          quiz's size + pace or the board's grid + difficulty. */}
      <span data-testid="mode-facts" className="flex w-full flex-wrap items-center justify-center gap-1 lg:gap-1.5">
        <span className={chip}>
          <Clock className="size-3 shrink-0 lg:size-4" strokeWidth={3} aria-hidden="true" />
          {t('education.modePicker.minutes', { count: minutes })}
        </span>
        {facts.map((fact) => {
          const Icon = FACT_ICON[fact.kind];
          return (
            <span key={fact.kind} data-testid={`mode-fact-${fact.kind}`} className={chip}>
              <Icon className="hidden size-3 shrink-0 sm:block lg:size-4" strokeWidth={3} aria-hidden="true" />
              {factLabel(fact, t)}
            </span>
          );
        })}
      </span>

      {recommended && (
        <span
          data-testid="mode-recommended"
          className="absolute -start-1.5 -top-2 z-10 inline-flex max-w-[90%] -rotate-3 items-center gap-0.5 truncate rounded-neo border-[2px] border-neo-black bg-neo-yellow px-1 py-0.5 font-neo-display text-[0.55rem] font-black uppercase leading-none text-neo-black shadow-hard-sm lg:text-xs"
        >
          <Sparkles className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
          {t('education.modePicker.recommended')}
        </span>
      )}
    </button>
  );
}

function factLabel(fact: ModeFactChip, t: (key: string, params?: Record<string, string | number>) => string): string {
  switch (fact.kind) {
    case 'questions':
      return tr(t, 'academy.launch.questions', '{{count}} Qs', { count: fact.count });
    case 'pace':
      return tr(t, 'academy.launch.pace', '{{seconds}}s each', { seconds: fact.seconds });
    case 'board':
      return fact.label;
    case 'letters':
      return tr(t, 'academy.launch.minLetters', '{{count}}+ letters', { count: fact.min });
  }
}

export default LobbyModeCard;
