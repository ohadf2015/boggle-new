'use client';

import React, { useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { RuneCard, RuneCardDef } from '@/types/wordForge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface RunePickerProps {
  offering: RuneCardDef[];
  equippedRunes: RuneCard[];
  maxSlots: number;
  round: number;
  onPick: (rune: RuneCardDef, replaceIndex?: number) => void;
  onSkip: () => void;
}

const RARITY_STYLES: Record<string, { border: string; badge: string; bg: string }> = {
  common: { border: 'border-gray-400', badge: 'bg-gray-300 text-neo-black', bg: '' },
  rare: { border: 'border-neo-purple', badge: 'bg-neo-purple text-neo-cream', bg: 'ring-2 ring-neo-purple/20' },
  legendary: { border: 'border-tier-gold', badge: 'bg-tier-gold text-neo-black', bg: 'ring-2 ring-tier-gold/30' },
};

/**
 * RunePicker — Pick 1 of 3 rune cards between rounds.
 * If rune slots are full, shows replace overlay.
 */
export function RunePicker({
  offering,
  equippedRunes,
  maxSlots,
  round,
  onPick,
  onSkip,
}: RunePickerProps): React.JSX.Element {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [selectedRune, setSelectedRune] = useState<RuneCardDef | null>(null);
  const [pickingRune, setPickingRune] = useState<string | null>(null);
  const slotsAreFull = equippedRunes.length >= maxSlots;

  const handleCardClick = (rune: RuneCardDef) => {
    if (slotsAreFull) {
      setSelectedRune(rune);
    } else {
      // Brief scale-up before transition
      setPickingRune(rune.id);
      setTimeout(() => onPick(rune), prefersReducedMotion ? 0 : 200);
    }
  };

  // Replace overlay
  if (selectedRune && slotsAreFull) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-6 p-4">
        <h2 className="text-xl font-black uppercase text-neo-cream font-neo-display">
          {t('wordForge.replaceWhich')}
        </h2>
        <p className="text-sm text-neo-cream/60 font-neo-body">
          {selectedRune.icon} {selectedRune.name}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {equippedRunes.map((rune, i) => (
            <button
              type="button"
              key={rune.instanceId}
              onClick={() => onPick(selectedRune, i)}
              className={cn(
                'w-20 h-24 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard',
                'flex flex-col items-center justify-center gap-1',
                'hover:bg-neo-red/20 hover:border-neo-red',
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                'transition-all duration-100',
              )}
            >
              <span className="text-xl">{rune.def.icon}</span>
              <span className="text-[10px] font-bold text-neo-black uppercase leading-tight text-center">
                {rune.def.name}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSelectedRune(null)}
          className="text-sm text-neo-cream/50 underline mt-2"
        >
          {t('wordForge.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-8 p-4">
      <h2 className="text-2xl sm:text-3xl font-black uppercase text-neo-cream font-neo-display tracking-tight">
        {t('wordForge.chooseRune')}
      </h2>

      {/* Three cards */}
      <div className="flex gap-2 sm:gap-4 justify-center">
        {offering.map((rune, idx) => {
          const styles = RARITY_STYLES[rune.rarity];
          const isPicking = pickingRune === rune.id;
          return (
            <m.button
              type="button"
              key={rune.id}
              onClick={() => handleCardClick(rune)}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isPicking ? 1.1 : 1,
              }}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: prefersReducedMotion ? 0 : idx * 0.1,
              }}
              className={cn(
                'w-[min(110px,30vw)] sm:w-[130px] bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg',
                'flex flex-col items-center p-3 gap-2',
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                styles.bg,
              )}
            >
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-full border-3 flex items-center justify-center text-2xl',
                styles.border,
                'bg-white/50',
              )}>
                {rune.icon}
              </div>

              {/* Name */}
              <h3 className="text-xs sm:text-sm font-black uppercase text-neo-black font-neo-display text-center leading-tight">
                {rune.name}
              </h3>

              {/* Effect description */}
              <p className="text-[10px] sm:text-xs text-neo-black/70 font-neo-body text-center leading-snug flex-1">
                {t(rune.descriptionKey)}
              </p>

              {/* Rarity badge */}
              <span className={cn(
                'px-2 py-0.5 text-[9px] font-black uppercase rounded-neo border-2 border-neo-black',
                styles.badge,
              )}>
                {rune.rarity}
              </span>
            </m.button>
          );
        })}
      </div>

      {/* Equipped runes */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neo-cream/40 font-neo-body uppercase">
          {t('wordForge.yourRunes')}:
        </span>
        {Array.from({ length: maxSlots }, (_, i) => {
          const rune = equippedRunes[i];
          return (
            <div
              key={`slot-${i}`}
              className={cn(
                'w-8 h-8 rounded-neo border-2 flex items-center justify-center text-sm',
                rune
                  ? 'bg-neo-cream border-neo-black shadow-hard-sm'
                  : 'bg-transparent border-dashed border-neo-cream/20',
              )}
            >
              {rune?.def.icon ?? ''}
            </div>
          );
        })}
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="text-sm text-neo-cream/40 font-neo-body hover:text-neo-cream/70 transition-colors"
      >
        {t('wordForge.skip')} (+5 {t('wordForge.bonusPoints')})
      </button>

      {/* Round indicator */}
      <span className="text-xs text-neo-cream/30 font-neo-body">
        {t('wordForge.roundOf', { round, max: 9 })}
      </span>
    </div>
  );
}
