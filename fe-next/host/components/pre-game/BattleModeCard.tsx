'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, FileText, Target, Check } from 'lucide-react';
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
  largeIcon: React.ReactNode;
  nameKey: string;
  descKey: string;
  featureKeys: [string, string, string];
  accentColor: string;
  accentBorder: string;
  accentBg: string;
  activeText: string;
  activeBg: string;
}

const MODES: ModeVisualConfig[] = [
  {
    mode: 'random',
    icon: <Shuffle className="w-4 h-4" />,
    largeIcon: <Shuffle className="w-7 h-7" />,
    nameKey: 'gameModes.random',
    descKey: 'gameModes.randomDescription',
    featureKeys: ['gameModes.randomFeature1', 'gameModes.randomFeature2', 'gameModes.randomFeature3'],
    accentColor: 'bg-neo-purple',
    accentBorder: 'border-l-neo-purple',
    accentBg: 'bg-neo-purple',
    activeText: 'text-neo-purple',
    activeBg: 'bg-neo-purple',
  },
  {
    mode: 'classic',
    icon: <FileText className="w-4 h-4" />,
    largeIcon: <FileText className="w-7 h-7" />,
    nameKey: 'gameModes.classic.name',
    descKey: 'gameModes.classic.description',
    featureKeys: ['gameModes.classic.feature1', 'gameModes.classic.feature2', 'gameModes.classic.feature3'],
    accentColor: 'bg-neo-cyan',
    accentBorder: 'border-l-neo-cyan',
    accentBg: 'bg-neo-cyan',
    activeText: 'text-neo-cyan',
    activeBg: 'bg-neo-cyan',
  },
  {
    mode: 'word-hunt',
    icon: <Target className="w-4 h-4" />,
    largeIcon: <Target className="w-7 h-7" />,
    nameKey: 'gameModes.wordHunt.name',
    descKey: 'gameModes.wordHunt.description',
    featureKeys: ['gameModes.wordHunt.feature1', 'gameModes.wordHunt.feature2', 'gameModes.wordHunt.feature3'],
    accentColor: 'bg-neo-pink',
    accentBorder: 'border-l-neo-pink',
    accentBg: 'bg-neo-pink',
    activeText: 'text-neo-pink',
    activeBg: 'bg-neo-pink',
  },
  {
    mode: 'wheel-rush',
    icon: <Target className="w-4 h-4" />,
    largeIcon: <Target className="w-7 h-7" />,
    nameKey: 'gameModes.wheelRush.name',
    descKey: 'gameModes.wheelRush.description',
    featureKeys: ['gameModes.wheelRush.feature1', 'gameModes.wheelRush.feature2', 'gameModes.wheelRush.feature3'],
    accentColor: 'bg-neo-lime',
    accentBorder: 'border-l-neo-lime',
    accentBg: 'bg-neo-lime',
    activeText: 'text-neo-lime',
    activeBg: 'bg-neo-lime',
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

  const visibleModes = MODES;
  const activeMode = visibleModes.find(m => m.mode === selectedGameMode) ?? visibleModes[0];

  return (
    <section className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard overflow-hidden">
      <div className="p-3 space-y-2">
      {/* Section label */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neo-cream/50 px-0.5">
        {t('hostView.battleMode')}
      </h3>
      {/* Horizontal chips row — equal-width */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {visibleModes.map(({ mode, icon, nameKey, activeBg }) => {
            const isActive = selectedGameMode === mode;

            return (
              <motion.button
                key={mode}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(mode)}
                data-testid={`game-mode-${mode}`}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border-2 text-xs font-bold uppercase transition-all whitespace-nowrap',
                  isActive
                    ? `${activeBg} border-neo-black text-neo-black shadow-hard-lg`
                    : 'bg-white/5 border-neo-white/15 text-neo-cream/60 hover:border-neo-white/30 hover:bg-white/10'
                )}
              >
                <span className={cn(isActive ? 'text-neo-black' : 'text-neo-cream/50')}>
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
                      <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mode Explainer Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode.mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex gap-3 p-3 rounded-neo border-2 border-neo-black border-l-4 bg-neo-navy-light/80 shadow-hard-sm',
            activeMode.accentBorder
          )}
        >
          <div className={cn(
            'w-14 h-14 rounded-neo border-2 border-neo-black flex items-center justify-center shrink-0 shadow-hard-sm text-neo-black',
            activeMode.accentBg
          )}>
            {activeMode.largeIcon}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className={cn('font-neo-display text-lg leading-none tracking-tight uppercase', activeMode.activeText)}>
              {t(activeMode.nameKey)}
            </h4>
            <p className="text-[11px] text-neo-cream/60 leading-tight">
              {t(activeMode.descKey)}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      </div>
    </section>
  );
}
