'use client';

import React, { useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Shuffle, FileText, Target, Check, Bomb, Building2, Link2, Gavel, Grid3x3 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getModeDescription, type GameModeOption } from '@/components/GameModeSelector';
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
  icon: React.ReactNode;
  nameKey: string;
  activeBg: string;
}

const MODES: ModeVisualConfig[] = [
  {
    mode: 'random',
    icon: <Shuffle className="w-4 h-4" />,
    nameKey: 'gameModes.random',
    activeBg: 'bg-neo-purple',
  },
  {
    mode: 'classic',
    icon: <FileText className="w-4 h-4" />,
    nameKey: 'gameModes.classic.name',
    activeBg: 'bg-neo-cyan',
  },
  {
    mode: 'word-hunt',
    icon: <Target className="w-4 h-4" />,
    nameKey: 'gameModes.wordHunt.name',
    activeBg: 'bg-neo-pink',
  },
  {
    mode: 'wheel-rush',
    icon: <Target className="w-4 h-4" />,
    nameKey: 'gameModes.wheelRush.name',
    activeBg: 'bg-neo-lime',
  },
  {
    mode: 'blast',
    icon: <Bomb className="w-4 h-4" />,
    nameKey: 'gameModes.blast.name',
    activeBg: 'bg-neo-pink',
  },
  {
    mode: 'word-tower',
    icon: <Building2 className="w-4 h-4" />,
    nameKey: 'wordTower.cardTitle',
    activeBg: 'bg-neo-purple',
  },
  {
    mode: 'shiritori',
    icon: <Link2 className="w-4 h-4" />,
    nameKey: 'gameModes.shiritori.name',
    activeBg: 'bg-neo-purple',
  },
  {
    mode: 'sealed-bid',
    icon: <Gavel className="w-4 h-4" />,
    nameKey: 'gameModes.sealedBid.name',
    activeBg: 'bg-neo-pink',
  },
  {
    mode: 'crossword',
    icon: <Grid3x3 className="w-4 h-4" />,
    nameKey: 'gameModes.crossword.name',
    activeBg: 'bg-neo-cyan',
  },
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
    <section className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard overflow-hidden">
      <div className="p-3 space-y-2">
      {/* Section label */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neo-cream/50 px-0.5">
        {t('hostView.battleMode')}
      </h3>
      {/* Showcase cards: each mode shows its own icon + name + one-line rule.
          2-col on mobile, 3-col on wide rails — the per-card vertical layout
          gives long labels (e.g. Spanish "CAZA DE PALABRAS") room to wrap, so
          they no longer overflow as they did in the old single-row chips. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
        {visibleModes.map(({ mode, icon, nameKey, activeBg }) => {
            const isActive = selectedGameMode === mode;

            return (
              <m.button
                key={mode}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(mode)}
                data-testid={`game-mode-${mode}`}
                aria-pressed={isActive}
                className={cn(
                  'flex flex-col items-start gap-1.5 p-2.5 rounded-xl border-2 text-left transition-all',
                  isActive
                    ? `${activeBg} border-neo-black shadow-hard-lg`
                    : 'bg-white/5 border-neo-white/15 hover:border-neo-white/30 hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-lg border-2 border-neo-black shrink-0',
                      isActive ? 'bg-neo-black/15 text-neo-black' : 'bg-neo-navy/60 text-neo-cream/70'
                    )}
                  >
                    {icon}
                  </span>
                  <span
                    className={cn(
                      'flex-1 min-w-0 text-xs font-bold uppercase leading-tight',
                      isActive ? 'text-neo-black' : 'text-neo-cream/80'
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
                <span
                  className={cn(
                    'text-[10px] leading-snug line-clamp-2',
                    isActive ? 'text-neo-black/70' : 'text-neo-cream/45'
                  )}
                >
                  {getModeDescription(mode, t)}
                </span>
              </m.button>
            );
          })}
      </div>
      </div>
    </section>
  );
}
