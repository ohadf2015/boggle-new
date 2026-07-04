'use client';

import React, { useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getModeDescription, MODE_ICONS, type GameModeOption } from '@/components/GameModeSelector';
import { useExperiment } from '@/hooks/useExperiment';
import { isShiritoriAvailable } from '@/shared/utils/availableModes';

interface BattleModeCardProps {
  selectedGameMode: GameModeOption;
  setSelectedGameMode: (mode: GameModeOption) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** When true, surfaces the admin-only Word Tower + Shiritori previews. (Blast is public — no longer gated.) */
  isAdmin?: boolean;
  /** Board/game language — gates Shiritori (Japanese-only). */
  language?: string | null;
  /** @deprecated Blast is offered to all players now; this no longer affects visibility. */
  hasBlastAccess?: boolean;
}

// ==================== Mode Visual Configs ====================

interface ModeVisualConfig {
  mode: GameModeOption;
  nameKey: string;
  /** Neo color family — drives the always-on color identity (icon, border,
   *  hover hard-shadow) and the solid fill when the card is selected. */
  family: NeoFamily;
}

type NeoFamily = 'cyan' | 'pink' | 'lime' | 'purple';

/**
 * Per-family class strings. Full literals (never runtime-concatenated) so
 * Tailwind's JIT keeps every utility in the build. Each card wears its mode's
 * color even at rest — a faint tinted border + a colored icon — so the picker
 * reads as an electric, color-coded palette instead of a grid of dead chips.
 * On hover the mode's HARD pixel-shadow snaps in (no blur — house rule) and the
 * border saturates; on select the family color floods the whole card.
 */
const FAMILY_STYLE: Record<NeoFamily, {
  activeBg: string;
  icon: string;
  iconBorder: string;
  restBorder: string;
  hoverBorder: string;
  hoverShadow: string;
}> = {
  cyan: {
    activeBg: 'bg-neo-cyan',
    icon: 'text-neo-cyan',
    iconBorder: 'border-neo-cyan/40',
    restBorder: 'border-neo-cyan/40',
    hoverBorder: 'hover:border-neo-cyan/70',
    hoverShadow: 'hover:shadow-hard-cyan',
  },
  pink: {
    activeBg: 'bg-neo-pink',
    icon: 'text-neo-pink',
    iconBorder: 'border-neo-pink/40',
    restBorder: 'border-neo-pink/40',
    hoverBorder: 'hover:border-neo-pink/70',
    hoverShadow: 'hover:shadow-hard-pink',
  },
  lime: {
    activeBg: 'bg-neo-lime',
    icon: 'text-neo-lime',
    iconBorder: 'border-neo-lime/40',
    restBorder: 'border-neo-lime/40',
    hoverBorder: 'hover:border-neo-lime/70',
    hoverShadow: 'hover:shadow-hard-lime',
  },
  purple: {
    activeBg: 'bg-neo-purple',
    icon: 'text-neo-purple',
    iconBorder: 'border-neo-purple/40',
    restBorder: 'border-neo-purple/40',
    hoverBorder: 'hover:border-neo-purple/70',
    hoverShadow: 'hover:shadow-hard-purple',
  },
};

const MODES: ModeVisualConfig[] = [
  { mode: 'random', nameKey: 'gameModes.random', family: 'purple' },
  { mode: 'classic', nameKey: 'gameModes.classic.name', family: 'cyan' },
  { mode: 'word-hunt', nameKey: 'gameModes.wordHunt.name', family: 'pink' },
  { mode: 'wheel-rush', nameKey: 'gameModes.wheelRush.name', family: 'lime' },
  { mode: 'blast', nameKey: 'gameModes.blast.name', family: 'pink' },
  { mode: 'word-tower', nameKey: 'wordTower.cardTitle', family: 'purple' },
  { mode: 'shiritori', nameKey: 'gameModes.shiritori.name', family: 'purple' },
  { mode: 'sealed-bid', nameKey: 'gameModes.sealedBid.name', family: 'pink' },
  { mode: 'crossword', nameKey: 'gameModes.crossword.name', family: 'cyan' },
];

// ==================== Main Component ====================

export function BattleModeCard({
  selectedGameMode,
  setSelectedGameMode,
  t,
  isAdmin = false,
  language = null,
}: BattleModeCardProps): React.ReactElement {
  const handleSelect = useCallback((mode: GameModeOption) => {
    setSelectedGameMode(mode);
  }, [setSelectedGameMode]);

  // Blast is now offered to ALL players (gate removed after MP-blast parity).
  // Word Tower stays admin-only AND behind the `word-tower` experiment (mirrors
  // the solo gating; server enforces admin too). Shiritori is an in-work beta
  // mode: admin-only AND Japanese-only (server gates it the same — JA dictionary
  // + canAccessInWorkMode), so it never reaches non-beta players' rotation.
  const { variant: wordTowerVariant } = useExperiment('word-tower');
  const wordTowerEnabled = isAdmin && wordTowerVariant === 'on';
  const shiritoriEnabled = isAdmin && isShiritoriAvailable(language);
  // Sealed Bid has curated racks + dictionary only for EN and HE boards.
  const sealedBidEnabled = isAdmin && (language === 'en' || language === 'he');
  // Crossword has a baked puzzle pool for every locale (falls back to EN).
  const crosswordEnabled = isAdmin;
  const visibleModes = MODES.filter((m) => {
    if (m.mode === 'word-tower') return wordTowerEnabled;
    if (m.mode === 'shiritori') return shiritoriEnabled;
    if (m.mode === 'sealed-bid') return sealedBidEnabled;
    if (m.mode === 'crossword') return crosswordEnabled;
    return true;
  });

  return (
    <section className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light/80 shadow-hard overflow-hidden">
      <div className="p-3 space-y-2">
      {/* Section label */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neo-cream/70 px-0.5">
        {t('hostView.battleMode')}
      </h3>
      {/* Compact picker: every mode is a short icon + name chip, so the whole
          grid stays low. ONLY the selected mode expands to reveal its one-line
          rule — tapping a card both selects it and shows the details, instead of
          every card permanently spending two lines on a description. 2-col on
          mobile, 3-col on wide rails; long labels (e.g. Spanish "CAZA DE
          PALABRAS") still wrap without overflowing. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
        {visibleModes.map(({ mode, nameKey, family }) => {
            const isActive = selectedGameMode === mode;
            const style = FAMILY_STYLE[family];

            return (
              <m.button
                key={mode}
                type="button"
                layout
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(mode)}
                data-testid={`game-mode-${mode}`}
                aria-pressed={isActive}
                className={cn(
                  'flex flex-col items-start gap-1 p-2 rounded-xl border-2 text-left transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                  isActive
                    ? `${style.activeBg} border-neo-black shadow-hard-lg`
                    : cn(
                        'bg-neo-navy-light/60 hover:bg-neo-navy-light',
                        style.restBorder,
                        style.hoverBorder,
                        style.hoverShadow,
                      )
                )}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-lg border-2 shrink-0',
                      isActive
                        ? 'bg-neo-black/15 border-neo-black text-neo-black'
                        : cn('bg-neo-navy', style.iconBorder, style.icon)
                    )}
                  >
                    {MODE_ICONS[mode]}
                  </span>
                  <span
                    className={cn(
                      'flex-1 min-w-0 text-xs font-bold uppercase leading-tight',
                      isActive ? 'text-neo-black' : 'text-neo-cream'
                    )}
                  >
                    {t(nameKey)}
                  </span>
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <m.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        <Check className="w-3.5 h-3.5 text-neo-black" strokeWidth={3} />
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Details reveal only for the selected mode — keeps the grid short. */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <m.span
                      key="desc"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="block overflow-hidden text-[10px] leading-snug text-neo-black/80"
                    >
                      {getModeDescription(mode, t)}
                    </m.span>
                  )}
                </AnimatePresence>
              </m.button>
            );
          })}
      </div>
      </div>
    </section>
  );
}
