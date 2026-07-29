'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import {
  Search,
  Zap,
  Target,
  RotateCw,
  Building2,
  Link,
  Shuffle,
  type LucideIcon,
} from 'lucide-react';
import { getModePresentation, type ModeColorFamily } from '@/lib/multiplayer/modePresentation';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface NextModeTeaseProps {
  /** The upcoming mode (from the `gameReset` payload). Null hides the tease. */
  mode: string | null | undefined;
  t: TFunction;
  className?: string;
}

const ICONS: Record<string, LucideIcon> = {
  Search,
  Zap,
  Target,
  RotateCw,
  Building2,
  Link,
  Shuffle,
};

/**
 * Per-colour-family static class strings. Tailwind needs whole class names
 * present in source to keep them in the build (no dynamic `neo-${color}`).
 */
const COLOR_CLASSES: Record<ModeColorFamily, { border: string; chip: string; text: string }> = {
  lime: { border: 'border-neo-lime', chip: 'bg-neo-lime', text: 'text-neo-lime' },
  pink: { border: 'border-neo-pink', chip: 'bg-neo-pink', text: 'text-neo-pink' },
  cyan: { border: 'border-neo-cyan', chip: 'bg-neo-cyan', text: 'text-neo-cyan' },
  purple: { border: 'border-neo-purple', chip: 'bg-neo-purple', text: 'text-neo-purple' },
  orange: { border: 'border-neo-orange', chip: 'bg-neo-orange', text: 'text-neo-orange' },
};

/**
 * NextModeTease — between-rounds "NEXT UP" banner.
 *
 * Council consensus (2026-05-31): with weighted-random mode rotation, players
 * lose track of what's coming. This teases the upcoming mode (icon + name +
 * 1-word hook) in its electric mode colour during the post-round window, so
 * the format change never feels like a surprise. Data is already broadcast on
 * the `gameReset` event (`gameMode`); this is the presentation.
 *
 * RTL-safe (logical spacing, no left/right), reduced-motion aware.
 */
const NextModeTease: React.FC<NextModeTeaseProps> = ({ mode, t, className }) => {
  const reducedMotion = useReducedMotion();

  if (mode == null) return null;

  const p = getModePresentation(mode);
  const Icon = ICONS[p.icon] ?? Shuffle;
  const colors = COLOR_CLASSES[p.color];

  return (
    <m.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={[
        'flex items-center gap-3 rounded-neo border-3 bg-neo-navy-light px-4 py-3 shadow-hard',
        colors.border,
        className ?? '',
      ].join(' ')}
    >
      {/* Mode icon chip — solid mode colour, hard border */}
      <div
        className={[
          'shrink-0 flex h-11 w-11 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm',
          colors.chip,
        ].join(' ')}
      >
        <Icon className="h-6 w-6 text-neo-black" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-neo-body font-bold uppercase tracking-widest text-neo-white/60">
          {t('results.modeTease.nextUp')}
        </p>
        <p className={['truncate font-neo-display text-lg font-black uppercase', colors.text].join(' ')}>
          {t(p.labelKey)}
        </p>
        <p className="truncate text-xs font-neo-body font-semibold text-neo-white/80">
          {t(p.hookKey)}
        </p>
      </div>
    </m.div>
  );
};

export default NextModeTease;
