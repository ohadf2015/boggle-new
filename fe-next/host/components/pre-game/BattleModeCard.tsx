'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Shuffle, FileText, Bomb, Target, Check } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import { cn } from '../../../lib/utils';
import type { GameModeOption } from '@/components/GameModeSelector';

interface PlayerData {
  username: string;
  isHost?: boolean;
  isBot?: boolean;
}

interface BattleModeCardProps {
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGameMode: GameModeOption;
  setSelectedGameMode: (mode: GameModeOption) => void;
  gameCode?: string;
  playersReady?: (string | PlayerData)[];
  t: (path: string, params?: Record<string, string | number>) => string;
  /** When false, blast mode is hidden from the mode selector */
  isAdmin?: boolean;
  /** When true, blast mode is visible (granted by admin) */
  hasBlastAccess?: boolean;
  /** Compact layout with tighter padding for mobile */
  compact?: boolean;
  /** Optional slot rendered at the bottom of the card (e.g. language selector) */
  children?: React.ReactNode;
}

// ==================== Mode Visual Configs ====================

interface ModeVisualConfig {
  mode: GameModeOption;
  icon: React.ReactNode;
  nameKey: string;
  activeBorder: string;
  activeText: string;
  activeGlow: string;
}

const MODES: ModeVisualConfig[] = [
  {
    mode: 'random',
    icon: <Shuffle className="w-5 h-5" />,
    nameKey: 'gameModes.random',
    activeBorder: 'border-neo-purple',
    activeText: 'text-neo-purple',
    activeGlow: 'shadow-[0_0_0_2px_rgba(139,92,246,0.25)]',
  },
  {
    mode: 'classic',
    icon: <FileText className="w-5 h-5" />,
    nameKey: 'gameModes.classic.name',
    activeBorder: 'border-neo-cyan',
    activeText: 'text-neo-cyan',
    activeGlow: 'shadow-[0_0_0_2px_rgba(0,255,255,0.25)]',
  },
  {
    mode: 'blast',
    icon: <Bomb className="w-5 h-5" />,
    nameKey: 'gameModes.blast.name',
    activeBorder: 'border-neo-orange',
    activeText: 'text-neo-orange',
    activeGlow: 'shadow-[0_0_0_2px_rgba(255,107,53,0.25)]',
  },
  {
    mode: 'word-hunt',
    icon: <Target className="w-5 h-5" />,
    nameKey: 'gameModes.wordHunt.name',
    activeBorder: 'border-neo-pink',
    activeText: 'text-neo-pink',
    activeGlow: 'shadow-[0_0_0_2px_rgba(255,20,147,0.25)]',
  },
];

// One-time stagger entrance — plays on mount, doesn't loop
const containerVariants = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 8, scale: 0.96 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 420, damping: 26 },
  },
};

// ==================== Main Component ====================

export function BattleModeCard({
  hostPlaying,
  setHostPlaying,
  selectedGameMode,
  setSelectedGameMode,
  t,
  isAdmin = false,
  hasBlastAccess = false,
  compact = false,
  children,
}: BattleModeCardProps): React.ReactElement {
  // Filter modes: blast visible to admins or blast_access users
  const visibleModes = (isAdmin || hasBlastAccess) ? MODES : MODES.filter(m => m.mode !== 'blast');

  const handleSelect = useCallback((mode: GameModeOption) => {
    setSelectedGameMode(mode);
  }, [setSelectedGameMode]);

  return (
    <section>
      <div className={cn('bg-neo-navy-light text-neo-cream rounded-xl border-3 border-neo-black shadow-hard', compact ? 'p-2.5' : 'p-3')}>
        {/* Mode grid — stagger entrance + active glow ring, no continuous effects */}
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className={cn('grid grid-cols-2', compact ? 'gap-1.5' : 'gap-2')}
        >
          {visibleModes.map(({ mode, icon, nameKey, activeBorder, activeText, activeGlow }) => {
            const isActive = selectedGameMode === mode;

            return (
              <motion.button
                key={mode}
                type="button"
                variants={cardVariants}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(mode)}
                data-testid={`game-mode-${mode}`}
                className={cn(
                  'relative flex items-center rounded-neo border-2 text-start transition-[background-color,border-color,box-shadow] duration-200',
                  compact ? 'gap-2 p-2' : 'gap-2.5 p-2.5',
                  isActive
                    ? `${activeBorder} bg-neo-navy ${activeGlow}`
                    : 'bg-neo-navy/60 border-neo-white/15 hover:border-neo-white/35'
                )}
              >
                <motion.div
                  className={cn('shrink-0', isActive ? activeText : 'text-neo-cream/60')}
                  animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  {icon}
                </motion.div>
                <p className={cn(
                  'font-bold text-sm leading-tight flex-1 min-w-0 truncate',
                  isActive ? activeText : 'text-neo-cream'
                )}>
                  {t(nameKey)}
                </p>
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="shrink-0"
                    >
                      <Check className={cn('w-4 h-4', activeText)} strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Broadcast Mode - desktop only */}
        <div className="mt-3 pt-3 border-t border-neo-white/10 hidden lg:flex items-center gap-2">
          <Monitor className="w-4 h-4 text-neo-cream/50 shrink-0" />
          <Checkbox
            id={`broadcastMode-${compact ? 'mobile' : 'desktop'}`}
            checked={!hostPlaying}
            onCheckedChange={(checked) => setHostPlaying(checked !== true)}
            aria-label={t('hostView.broadcastModeTitle')}
          />
          <label
            htmlFor={`broadcastMode-${compact ? 'mobile' : 'desktop'}`}
            className="text-xs font-bold uppercase text-neo-cream/80 cursor-pointer flex-1"
          >
            {t('hostView.broadcastModeTitle')}
          </label>
        </div>

        {/* Optional footer slot (e.g. language selector) */}
        {children && (
          <div className="mt-3 pt-3 border-t border-neo-white/10">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
