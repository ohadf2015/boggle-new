'use client';

import { m } from 'framer-motion';
import { Check, Lightbulb, X } from 'lucide-react';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';

interface BridgeOutcomeTilesProps {
  outcomes: readonly BridgeOutcome[];
}

/**
 * The day's bridge chain as big pop-in icon tiles — the shareable artifact.
 * Mirrors the share-text legend with icons (no emoji): clean solve = lime
 * check · messy solve = yellow check · hint = bulb · reached-not-solved =
 * red X · never reached = empty.
 */
export default function BridgeOutcomeTiles({ outcomes }: BridgeOutcomeTilesProps) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {outcomes.map((o, i) => {
        const kind = !o.reached ? 'unreached' : !o.solved ? 'failed' : o.hintUsed ? 'hint' : o.wrongAttempts > 0 ? 'messy' : 'clean';
        const tile: Record<string, string> = {
          clean: 'bg-neo-lime/20 border-neo-lime text-neo-lime',
          messy: 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow',
          hint: 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow',
          failed: 'bg-neo-red/20 border-neo-red text-neo-red',
          unreached: 'bg-neo-navy border-neo-white/20 text-transparent',
        };
        const Icon = kind === 'hint' ? Lightbulb : kind === 'failed' ? X : Check;
        return (
          <m.span
            key={`sq-${i}`}
            data-testid="recap-square"
            data-kind={kind}
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.15 + i * 0.08 }}
            className={`flex h-8 w-8 items-center justify-center rounded-neo border-2 shadow-hard-sm ${tile[kind]}`}
          >
            {kind !== 'unreached' && <Icon className="h-4 w-4" strokeWidth={3} />}
          </m.span>
        );
      })}
    </div>
  );
}
