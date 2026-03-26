'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import CircularTimer from '@/components/CircularTimer';
import ComboDisplay from '@/components/game/ComboDisplay';
import { cn } from '@/lib/utils';
import { formatScore } from '@/utils/scoreDisplay';

interface DesktopStatsPanelProps {
  /** Current score */
  score: number;
  /** Remaining time in seconds */
  remainingTime: number;
  /** Total game time in seconds */
  totalTime: number;
  /** Current combo level */
  comboLevel: number;
  /** Combo time remaining as percentage (0-100) */
  comboTimeRemaining?: number | null;
  /** Whether combo timer is in danger zone */
  comboDanger?: boolean;
  /** Maximum combo achieved */
  maxCombo: number;
  /** Number of valid words found */
  wordsFound: number;
  /** Total words available on board (optional) */
  totalBoardWords?: number | null;
  /** High score to beat (optional, for challenge mode) */
  targetHighScore?: number | null;
  /** Whether the game is in practice mode (no timer) */
  isPracticeMode?: boolean;
  /** Coin reward for combo animation */
  comboCoinReward?: number | null;
  /** Callback when coin animation completes */
  onCoinAnimationComplete?: () => void;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * DesktopStatsPanel - Left sidebar panel for desktop layout
 * Shows timer, score, combo, and word count in a clean vertical layout
 * Matches the SuperDesign refined-ui-design spec
 */
export const DesktopStatsPanel: React.FC<DesktopStatsPanelProps> = ({
  score,
  remainingTime,
  totalTime,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  wordsFound,
  totalBoardWords,
  isPracticeMode = false,
  comboCoinReward,
  onCoinAnimationComplete,
  t,
}) => {
  return (
    <div className="h-full flex flex-col gap-5 p-4 bg-neo-navy/50 rounded-neo border-2 border-neo-black/30">
      {/* Timer Section - Large and prominent */}
      {!isPracticeMode && (
        <div className="flex flex-col items-center">
          <CircularTimer
            remainingTime={remainingTime}
            totalTime={totalTime}
            size="lg"
          />
        </div>
      )}

      {/* Score Section - Lime gradient badge */}
      <div className="flex flex-col items-center">
        <motion.div
          key={score}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="w-full"
        >
          <div
            className="px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard"
            style={{ background: 'linear-gradient(135deg, var(--neo-yellow) 0%, var(--neo-lime) 100%)' }}
          >
            <div className="text-center">
              <div className="text-[8px] font-bold uppercase tracking-widest text-neo-black/60 mb-0.5">
                {t('common.score')}
              </div>
              <div className="text-4xl font-black text-neo-black leading-none tracking-tighter">
                {formatScore(score)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Combo Section */}
      <div className="flex flex-col items-center">
        <ComboDisplay
          comboLevel={comboLevel}
          compact={false}
          timeRemaining={comboTimeRemaining}
          isDanger={comboDanger}
          coinReward={comboCoinReward}
          onCoinAnimationComplete={onCoinAnimationComplete}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-neo-cream/15" />

      {/* Words Found - Clean stat display */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-neo",
        "bg-neo-black/20"
      )}>
        <div className="flex items-center gap-2 text-neo-cream/70">
          <Target className="w-4 h-4 text-neo-cyan" />
          <span className="text-xs font-medium">{t('singlePlayer.wordsFound')}</span>
        </div>
        <div className="font-bold text-neo-cyan tabular-nums">
          {wordsFound}
          {totalBoardWords && (
            <span className="text-neo-cream/50 text-xs ms-1">/ {totalBoardWords}</span>
          )}
        </div>
      </div>

      {/* Spacer pushes nothing to bottom - clean end */}
      <div className="flex-1" />
    </div>
  );
};

export default DesktopStatsPanel;
