'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, FileText, Bomb, Target, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { GameModeOption } from '@/components/GameModeSelector';

interface BattleModeCardProps {
  selectedGameMode: GameModeOption;
  setSelectedGameMode: (mode: GameModeOption) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** When false, blast mode is hidden from the mode selector */
  isAdmin?: boolean;
  /** When true, blast mode is visible (granted by admin) */
  hasBlastAccess?: boolean;
}

// ==================== Mode Visual Configs ====================

interface ModeVisualConfig {
  mode: GameModeOption;
  icon: React.ReactNode;
  nameKey: string;
  descKey: string;
  accentColor: string;
  activeText: string;
  activeBg: string;
}

const MODES: ModeVisualConfig[] = [
  {
    mode: 'random',
    icon: <Shuffle className="w-4 h-4" />,
    nameKey: 'gameModes.random',
    descKey: 'gameModes.randomDescription',
    accentColor: 'bg-neo-purple',
    activeText: 'text-neo-purple',
    activeBg: 'bg-neo-purple/15 border-neo-purple',
  },
  {
    mode: 'classic',
    icon: <FileText className="w-4 h-4" />,
    nameKey: 'gameModes.classic.name',
    descKey: 'gameModes.classic.description',
    accentColor: 'bg-neo-cyan',
    activeText: 'text-neo-cyan',
    activeBg: 'bg-neo-cyan/15 border-neo-cyan',
  },
  {
    mode: 'blast',
    icon: <Bomb className="w-4 h-4" />,
    nameKey: 'gameModes.blast.name',
    descKey: 'gameModes.blast.description',
    accentColor: 'bg-neo-orange',
    activeText: 'text-neo-orange',
    activeBg: 'bg-neo-orange/15 border-neo-orange',
  },
  {
    mode: 'word-hunt',
    icon: <Target className="w-4 h-4" />,
    nameKey: 'gameModes.wordHunt.name',
    descKey: 'gameModes.wordHunt.description',
    accentColor: 'bg-neo-pink',
    activeText: 'text-neo-pink',
    activeBg: 'bg-neo-pink/15 border-neo-pink',
  },
];

// ==================== Main Component ====================

export function BattleModeCard({
  selectedGameMode,
  setSelectedGameMode,
  t,
}: BattleModeCardProps): React.ReactElement {
  const handleSelect = useCallback((mode: GameModeOption) => {
    setSelectedGameMode(mode);
  }, [setSelectedGameMode]);

  const activeMode = MODES.find(m => m.mode === selectedGameMode) ?? MODES[0];

  return (
    <section className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard overflow-hidden">
      {/* Accent bar */}
      <div className="h-1 bg-linear-to-r from-neo-purple via-neo-cyan to-neo-pink" />
      <div className="p-3 space-y-2">
      {/* Section label */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neo-cream/50 px-0.5">
        {t('hostView.battleMode')}
      </h3>
      {/* Horizontal chips row — equal-width */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          {MODES.map(({ mode, icon, nameKey, activeText, activeBg }) => {
            const isActive = selectedGameMode === mode;

            return (
              <motion.button
                key={mode}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(mode)}
                data-testid={`game-mode-${mode}`}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-neo border-2 text-xs font-bold uppercase transition-all whitespace-nowrap',
                  isActive
                    ? `${activeBg} ${activeText}`
                    : 'bg-white/5 border-neo-white/15 text-neo-cream/60 hover:border-neo-white/30 hover:bg-white/10'
                )}
              >
                <span className={cn(isActive ? activeText : 'text-neo-cream/50')}>
                  {icon}
                </span>
                <span>{t(nameKey)}</span>
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      <Check className={cn('w-3 h-3', activeText)} strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Active mode description — one line with colored pip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode.mode}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 px-1"
        >
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', activeMode.accentColor)} />
          <p className="text-xs text-neo-cream/50 font-medium truncate">
            {t(activeMode.descKey)}
          </p>
        </motion.div>
      </AnimatePresence>
      </div>
    </section>
  );
}
