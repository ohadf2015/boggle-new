'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Shuffle, FileText, Bomb, Target, Check, Sparkles } from 'lucide-react';
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
  descKey: string;
  color: {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    glow: string;
    gradientFrom: string;
    gradientTo: string;
  };
  iconActiveClass: string;
}

const MODES: ModeVisualConfig[] = [
  {
    mode: 'random',
    icon: <Shuffle className="w-5 h-5" />,
    nameKey: 'gameModes.random',
    descKey: 'gameModes.randomizing',
    color: {
      bg: 'bg-neo-purple/20',
      border: 'border-neo-purple',
      text: 'text-neo-purple',
      activeBg: 'bg-neo-purple/30',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.4),0_0_40px_rgba(139,92,246,0.15)]',
      gradientFrom: 'from-neo-purple/40',
      gradientTo: 'to-neo-cyan/20',
    },
    iconActiveClass: 'animate-[spin_4s_linear_infinite]',
  },
  {
    mode: 'classic',
    icon: <FileText className="w-5 h-5" />,
    nameKey: 'gameModes.classic.name',
    descKey: 'gameModes.classic.description',
    color: {
      bg: 'bg-neo-cyan/20',
      border: 'border-neo-cyan',
      text: 'text-neo-cyan',
      activeBg: 'bg-neo-cyan/30',
      glow: 'shadow-[0_0_20px_rgba(0,255,255,0.35),0_0_40px_rgba(0,255,255,0.12)]',
      gradientFrom: 'from-neo-cyan/35',
      gradientTo: 'to-neo-purple/15',
    },
    iconActiveClass: 'animate-mode-icon-bounce',
  },
  {
    mode: 'blast',
    icon: <Bomb className="w-5 h-5" />,
    nameKey: 'gameModes.blast.name',
    descKey: 'gameModes.blast.description',
    color: {
      bg: 'bg-neo-orange/20',
      border: 'border-neo-orange',
      text: 'text-neo-orange',
      activeBg: 'bg-neo-orange/30',
      glow: 'shadow-[0_0_20px_rgba(255,107,53,0.45),0_0_40px_rgba(255,107,53,0.15)]',
      gradientFrom: 'from-neo-orange/40',
      gradientTo: 'to-neo-pink/20',
    },
    iconActiveClass: 'animate-mode-bomb-wobble',
  },
  {
    mode: 'word-hunt',
    icon: <Target className="w-5 h-5" />,
    nameKey: 'gameModes.wordHunt.name',
    descKey: 'gameModes.wordHunt.description',
    color: {
      bg: 'bg-neo-pink/20',
      border: 'border-neo-pink',
      text: 'text-neo-pink',
      activeBg: 'bg-neo-pink/30',
      glow: 'shadow-[0_0_20px_rgba(255,20,147,0.4),0_0_40px_rgba(255,20,147,0.12)]',
      gradientFrom: 'from-neo-pink/35',
      gradientTo: 'to-neo-orange/15',
    },
    iconActiveClass: 'animate-[pulse-subtle_1.5s_ease-in-out_infinite]',
  },
];

// ==================== Animation Variants ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9, rotate: -2 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 22,
      mass: 0.8,
    },
  },
};

const checkVariants = {
  initial: { scale: 0, rotate: -90 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
  exit: {
    scale: 0,
    rotate: 90,
    transition: { duration: 0.15 },
  },
};

const sparkVariants = {
  initial: { scale: 0, opacity: 1 },
  animate: {
    scale: [0, 1.2, 0],
    opacity: [1, 0.6, 0],
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

// ==================== Sub-Components ====================

/** Animated gradient background that breathes when card is selected */
function ModeGlowOverlay({ isActive, gradientFrom, gradientTo }: {
  isActive: boolean;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 rounded-neo bg-gradient-to-br transition-opacity duration-500 pointer-events-none',
        gradientFrom,
        gradientTo,
        isActive ? 'opacity-100 animate-mode-glow-breathe' : 'opacity-0'
      )}
    />
  );
}

/** Shimmer sweep that plays once on selection */
function ShimmerSweep({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return (
    <div className="absolute inset-0 rounded-neo overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[mode-shimmer-sweep_1.5s_ease-in-out_1]"
      />
    </div>
  );
}

/** Scan line effect for Word Hunt */
function ScanLineEffect({ isActive, mode }: { isActive: boolean; mode: GameModeOption }) {
  if (!isActive || mode !== 'word-hunt') return null;
  return (
    <div className="absolute inset-0 rounded-neo overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neo-pink/60 to-transparent animate-[mode-scan-line_2.5s_linear_infinite]"
      />
    </div>
  );
}

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
  const [sparkMode, setSparkMode] = useState<GameModeOption | null>(null);

  // Filter modes: blast visible to admins or blast_access users
  const visibleModes = (isAdmin || hasBlastAccess) ? MODES : MODES.filter(m => m.mode !== 'blast');

  const handleSelect = useCallback((mode: GameModeOption) => {
    if (mode !== selectedGameMode) {
      setSparkMode(mode);
      setTimeout(() => setSparkMode(null), 500);
    }
    setSelectedGameMode(mode);
  }, [selectedGameMode, setSelectedGameMode]);

  return (
    <section className="space-y-3">
      {/* Game Mode Cards */}
      <div className={cn('bg-neo-navy-light text-neo-cream rounded-xl border-3 border-neo-black shadow-hard relative overflow-hidden', compact ? 'p-2.5' : 'p-4')}>
        {/* Ambient background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neo-purple/10 via-transparent to-neo-cyan/5 pointer-events-none" />

        {/* Section label with sparkle */}
        <div className={cn('relative flex items-center gap-1.5', compact ? 'mb-1.5' : 'mb-3')}>
          <Sparkles className="w-3 h-3 text-neo-cream/40 animate-twinkle" />
          <p className="text-xs font-black uppercase text-neo-cream/50 tracking-widest">
            {t('gameModes.nextMode')}
          </p>
        </div>

        {/* Mode card grid with staggered entrance */}
        <motion.div
          className={cn('relative grid grid-cols-2', compact ? 'gap-1.5' : 'gap-2.5')}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {visibleModes.map(({ mode, icon, nameKey, descKey, color, iconActiveClass }) => {
            const isActive = selectedGameMode === mode;
            const isSparking = sparkMode === mode;

            return (
              <motion.button
                key={mode}
                variants={cardVariants}
                onClick={() => handleSelect(mode)}
                whileHover={{
                  scale: 1.04,
                  rotate: isActive ? 0 : 1,
                  transition: { type: 'spring', stiffness: 400, damping: 17 },
                }}
                whileTap={{
                  scale: 0.93,
                  rotate: -1,
                  transition: { type: 'spring', stiffness: 500, damping: 20 },
                }}
                data-testid={`game-mode-${mode}`}
                className={cn(
                  'relative flex items-center rounded-neo border-2 text-start overflow-hidden',
                  compact ? 'gap-2 p-2' : 'gap-3 p-3',
                  'transition-[border-color,box-shadow] duration-300',
                  isActive
                    ? `${color.activeBg} ${color.border} ${color.glow}`
                    : 'bg-neo-navy/60 border-neo-white/20 shadow-hard-sm hover:border-neo-white/40 hover:shadow-hard'
                )}
              >
                {/* Animated gradient overlay */}
                <ModeGlowOverlay
                  isActive={isActive}
                  gradientFrom={color.gradientFrom}
                  gradientTo={color.gradientTo}
                />

                {/* Shimmer sweep on selection */}
                <ShimmerSweep isActive={isActive} />

                {/* Scan line for Word Hunt */}
                <ScanLineEffect isActive={isActive} mode={mode} />

                {/* Selection spark burst */}
                <AnimatePresence>
                  {isSparking && (
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-neo border-2 pointer-events-none',
                        color.border
                      )}
                      variants={sparkVariants}
                      initial="initial"
                      animate="animate"
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>

                {/* Mode icon with active animation */}
                <div className={cn(
                  'relative p-2 rounded-neo shrink-0 transition-colors duration-200',
                  isActive ? color.text : 'text-neo-cream/70'
                )}>
                  <div className={cn(isActive && iconActiveClass)}>
                    {icon}
                  </div>
                </div>

                {/* Text content */}
                <div className="relative flex-1 min-w-0">
                  <p className={cn(
                    'font-bold text-sm leading-tight transition-colors duration-200',
                    isActive ? color.text : 'text-neo-cream'
                  )}>
                    {t(nameKey)}
                  </p>
                  <p className="text-[10px] text-neo-cream/50 leading-tight mt-0.5 line-clamp-2">
                    {t(descKey)}
                  </p>
                </div>

                {/* Animated check mark */}
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.div
                      variants={checkVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="relative shrink-0"
                    >
                      <Check className={cn('w-5 h-5', color.text)} strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Broadcast Mode - desktop only */}
        <div className="relative mt-3 pt-3 border-t border-neo-white/10 hidden lg:flex items-center gap-2">
          <Monitor className="w-4 h-4 text-neo-cream/50 flex-shrink-0" />
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
          <div className="relative mt-3 pt-3 border-t border-neo-white/10">
            {children}
          </div>
        )}
      </div>

    </section>
  );
}
