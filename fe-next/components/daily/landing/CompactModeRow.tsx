'use client';

import { m } from 'framer-motion';
import { Play, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface CompactModeRowProps {
  icon: ReactNode;
  title: string;
  color: 'orange' | 'yellow' | 'cyan' | 'purple';
  onPlay: () => void;
  played?: boolean;
  delay?: number;
  /** Mode artwork (the same mascot the hero card uses). Omitted → no art slot. */
  artUrl?: string;
  /** Small tag after the title, e.g. the optional bonus quest. */
  badge?: string;
  /** Visible text in the played badge, e.g. "Done". */
  doneLabel?: string;
  /** Daily mode id, exposed as `data-mode` so the hub's per-mode state is queryable. */
  modeId?: string;
}

/* Every class is spelled out in full: Tailwind only emits a class when the
   literal string appears in source, so `bg-neo-${color}` would silently produce
   nothing. Same rule the hero QuestCard documents. */
const COLOR_CONFIGS = {
  orange: { icon: 'text-neo-orange', edge: 'bg-neo-orange', ring: 'focus-visible:ring-neo-orange', tilt: 'rotate-1' },
  yellow: { icon: 'text-neo-yellow', edge: 'bg-neo-yellow', ring: 'focus-visible:ring-neo-yellow', tilt: '-rotate-1' },
  cyan: { icon: 'text-neo-cyan', edge: 'bg-neo-cyan', ring: 'focus-visible:ring-neo-cyan', tilt: 'rotate-1' },
  purple: { icon: 'text-neo-purple', edge: 'bg-neo-purple', ring: 'focus-visible:ring-neo-purple', tilt: '-rotate-1' },
} as const;

/**
 * CompactModeRow — a daily mode as a chunky, colour-coded tile.
 *
 * The hub used to list the other modes as three dark, near-identical rows with
 * a small lime button; players read it as a settings list, not as games. Each
 * mode is now its own tile, laid out side by side: the top is the mode's solid
 * accent with its mascot, the title sits under it, and the tile ends in a big
 * play button (or a "done" stamp once played). Same family as the home page
 * mode keycaps, so the two screens read as one game.
 *
 * When played: done stamp, mascot greyed, but still tappable — re-entering a
 * finished quest shows its results (Hunt, Wheel, Connections) or keeps the
 * daily tower climbing. A disabled tile would be a dead end.
 */
export function CompactModeRow({
  icon,
  title,
  color,
  onPlay,
  played = false,
  delay = 0,
  artUrl,
  badge,
  doneLabel,
  modeId,
}: CompactModeRowProps) {
  const config = COLOR_CONFIGS[color] ?? COLOR_CONFIGS.cyan;

  return (
    <m.div
      initial={{ opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 320, damping: 20 }}
      className="w-full h-full"
      data-testid={`compact-row-${color}`}
      data-mode={modeId}
      data-state={played ? 'done' : 'todo'}
    >
      <button
        type="button"
        onClick={onPlay}
        className={cn(
          'relative w-full h-full min-h-[164px] flex flex-col items-center overflow-hidden cursor-pointer',
          'rounded-2xl border-[3px] border-neo-black bg-neo-navy shadow-hard',
          'focus-visible:outline-hidden focus-visible:ring-4',
          config.ring,
          config.tilt,
          'transition-[transform,translate,scale,rotate,box-shadow] duration-150 group',
          'hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
          played && 'opacity-80'
        )}
      >
        {/* Accent block — the mode's colour, solid, behind the mascot. */}
        <span
          aria-hidden="true"
          data-testid={`mode-row-edge-${color}`}
          className={cn(
            'absolute inset-x-0 start-0 top-0 h-[58%] border-b-[3px] border-neo-black',
            config.edge,
            played && 'saturate-50'
          )}
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.14) 1.2px, transparent 1.3px)', backgroundSize: '8px 8px' }}
        />

        {badge && !played && (
          <span className="absolute top-1.5 end-1.5 z-10 rotate-6 rounded-md border-2 border-black bg-neo-cream px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-wide text-neo-navy shadow-hard-xs">
            {badge}
          </span>
        )}

        {/* Mode art — the strongest "which game is this" signal. A CSS
            background: purely decorative (the title names the mode), same
            convention as the hero QuestCard. */}
        {artUrl ? (
          <span
            aria-hidden="true"
            role="presentation"
            data-testid={`mode-row-art-${color}`}
            data-art-url={artUrl}
            style={{ backgroundImage: `url(${artUrl})` }}
            className={cn(
              'relative mt-3 shrink-0 w-[68px] h-[68px] rounded-xl bg-cover bg-center',
              'border-[3px] border-neo-black shadow-hard-sm -rotate-3',
              played ? 'grayscale' : 'motion-safe:group-hover:animate-[qp-avatar-bob_0.9s_ease-in-out_infinite]'
            )}
          />
        ) : (
          <span className={cn('relative mt-3 shrink-0 w-[68px] h-[68px] flex items-center justify-center rounded-xl border-[3px] border-neo-black bg-neo-black shadow-hard-sm -rotate-3', config.icon)}>
            {icon}
          </span>
        )}

        <h3 className="relative mt-3 px-1.5 text-center font-neo-display text-[15px] font-black leading-tight text-neo-white line-clamp-2">
          {title}
        </h3>

        <span className="relative mt-auto mb-2.5 pt-2">
          {played ? (
            <span
              className="flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-lime px-2.5 py-1 text-[11px] font-black uppercase text-neo-black shadow-hard-xs -rotate-3"
              data-testid={`${color}-done-badge`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              {doneLabel && <span>{doneLabel}</span>}
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm transition-transform group-hover:scale-110 group-active:scale-95">
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            </span>
          )}
        </span>
      </button>
    </m.div>
  );
}
