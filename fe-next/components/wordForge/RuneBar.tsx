'use client';

import React, { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import type { RuneCard } from '@/types/wordForge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface RuneBarProps {
  runes: RuneCard[];
  maxSlots: number;
  triggeredRuneIds?: string[];
}

const RARITY_BORDER: Record<string, string> = {
  common: 'border-gray-400',
  rare: 'border-neo-purple',
  legendary: 'border-tier-gold',
};

const RARITY_GLOW: Record<string, string> = {
  common: '',
  rare: 'ring-1 ring-neo-purple/30',
  legendary: 'ring-2 ring-tier-gold/40',
};

/**
 * RuneBar — Bottom bar showing equipped rune cards (5 slots).
 * Tap a rune to see its full effect description.
 */
const RARITY_RING: Record<string, string> = {
  common: 'ring-gray-400',
  rare: 'ring-neo-purple',
  legendary: 'ring-tier-gold',
};

export function RuneBar({ runes, maxSlots, triggeredRuneIds = [] }: RuneBarProps): React.JSX.Element {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [inspecting, setInspecting] = useState<number | null>(null);

  const slots = Array.from({ length: maxSlots }, (_, i) => runes[i] ?? null);

  return (
    <>
      {/* Inspect popup */}
      {inspecting !== null && runes[inspecting] && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-24 bg-black/50"
          onClick={() => setInspecting(null)}
        >
          <div
            className={cn(
              'bg-neo-cream border-4 border-neo-black shadow-hard-lg rounded-neo-lg p-4 max-w-xs',
              RARITY_GLOW[runes[inspecting].def.rarity],
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{runes[inspecting].def.icon}</span>
              <h3 className="font-black uppercase text-neo-black font-neo-display text-lg">
                {runes[inspecting].def.name}
              </h3>
            </div>
            <p className="text-sm text-neo-black/80 font-neo-body">
              {t(runes[inspecting].def.descriptionKey)}
            </p>
            <span className={cn(
              'inline-block mt-2 px-2 py-0.5 text-xs font-black uppercase rounded-neo border-2 border-neo-black',
              runes[inspecting].def.rarity === 'common' && 'bg-gray-300 text-neo-black',
              runes[inspecting].def.rarity === 'rare' && 'bg-neo-purple text-neo-cream',
              runes[inspecting].def.rarity === 'legendary' && 'bg-tier-gold text-neo-black',
            )}>
              {runes[inspecting].def.rarity}
            </span>
          </div>
        </div>
      )}

      {/* Rune Bar */}
      <div className="bg-[#0A0A1A] border-t-3 border-neo-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-2">
        {slots.map((rune, i) => {
          const isTriggered = rune ? triggeredRuneIds.includes(rune.instanceId) : false;
          return (
            <m.button
              key={rune?.instanceId ?? `slot-${i}`}
              onClick={() => rune && setInspecting(i)}
              disabled={!rune}
              animate={
                isTriggered && !prefersReducedMotion
                  ? { scale: [1, 1.15, 1] }
                  : {}
              }
              transition={{ duration: 0.3 }}
              className={cn(
                'w-12 h-12 rounded-neo border-3 flex items-center justify-center text-lg',
                'transition-all duration-100',
                rune
                  ? cn(
                      'bg-neo-cream shadow-hard-sm border-neo-black',
                      RARITY_BORDER[rune.def.rarity],
                      RARITY_GLOW[rune.def.rarity],
                      isTriggered && `ring-4 ${RARITY_RING[rune.def.rarity]}`,
                      'hover:translate-y-[-2px] hover:shadow-hard',
                      'active:translate-y-px active:shadow-hard-pressed',
                    )
                  : 'bg-transparent border-dashed border-neo-cream/20',
              )}
              aria-label={rune ? rune.def.name : `Empty rune slot ${i + 1}`}
            >
              {rune ? rune.def.icon : ''}
            </m.button>
          );
        })}
      </div>
    </>
  );
}
