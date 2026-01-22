'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, Target, TrendingUp, Clock } from 'lucide-react';
import CircularTimer from '@/components/CircularTimer';
import ComboDisplay from '@/components/game/ComboDisplay';
import { cn } from '@/lib/utils';

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
 * Shows timer, score, combo, and game stats in a vertical layout
 */
export const DesktopStatsPanel: React.FC<DesktopStatsPanelProps> = ({
  score,
  remainingTime,
  totalTime,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  maxCombo,
  wordsFound,
  totalBoardWords,
  targetHighScore,
  isPracticeMode = false,
  comboCoinReward,
  onCoinAnimationComplete,
  t,
}) => {
  // Calculate progress towards high score
  const highScoreProgress = targetHighScore ? Math.min(100, (score / targetHighScore) * 100) : null;
  const isBeatingHighScore = targetHighScore && score > targetHighScore;

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-neo-navy/50 rounded-neo border-2 border-neo-black/30">
      {/* Timer Section */}
      {!isPracticeMode && (
        <div className="flex flex-col items-center">
          <CircularTimer
            remainingTime={remainingTime}
            totalTime={totalTime}
            size="lg"
          />
        </div>
      )}

      {/* Score Section */}
      <div className="flex flex-col items-center">
        <motion.div
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="relative"
        >
          <div
            className={cn(
              "px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard",
              isBeatingHighScore
                ? "bg-gradient-to-br from-neo-lime to-neo-cyan"
                : "bg-gradient-to-br from-neo-lime to-neo-lime-light"
            )}
          >
            <div className="text-center">
              <div className="text-4xl font-black text-neo-black leading-none">
                {score}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-neo-black/70 mt-1">
                {t('common.score')}
              </div>
            </div>
          </div>
        </motion.div>

        {/* High Score Target */}
        {targetHighScore && !isPracticeMode && (
          <div className="mt-2 w-full">
            <div className="flex items-center justify-between text-xs text-neo-cream/70 mb-1">
              <span className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {t('singlePlayer.highScore')}
              </span>
              <span>{targetHighScore}</span>
            </div>
            <div className="h-2 bg-neo-black/30 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isBeatingHighScore ? "bg-neo-lime" : "bg-neo-cyan"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${highScoreProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {isBeatingHighScore && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-neo-lime font-bold text-center mt-1"
              >
                {t('singlePlayer.newHighScore')}!
              </motion.div>
            )}
          </div>
        )}
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
        {maxCombo > 1 && (
          <div className="text-xs text-neo-cream/60 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t('singlePlayer.maxCombo')}: {maxCombo}x
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-neo-cream/20" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-3">
        {/* Words Found */}
        <StatItem
          icon={<Target className="w-4 h-4" />}
          label={t('singlePlayer.wordsFound')}
          value={wordsFound}
          subValue={totalBoardWords ? `/ ${totalBoardWords}` : undefined}
          color="cyan"
        />

        {/* Time Elapsed (Practice Mode) */}
        {isPracticeMode && (
          <StatItem
            icon={<Clock className="w-4 h-4" />}
            label={t('singlePlayer.timeElapsed')}
            value={formatTime(totalTime - remainingTime)}
            color="pink"
          />
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-auto pt-4 border-t border-neo-cream/10">
        <div className="text-[10px] text-neo-cream/40 space-y-1">
          <div className="flex justify-between">
            <span>Enter</span>
            <span>{t('singlePlayer.submitWord')}</span>
          </div>
          <div className="flex justify-between">
            <span>Backspace</span>
            <span>{t('singlePlayer.clearWord')}</span>
          </div>
          <div className="flex justify-between">
            <span>Space</span>
            <span>{t('singlePlayer.pauseGame')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * StatItem - Individual stat display row
 */
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'cyan' | 'pink' | 'lime' | 'purple';
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, subValue, color }) => {
  const colorClasses = {
    cyan: 'text-neo-cyan',
    pink: 'text-neo-pink',
    lime: 'text-neo-lime',
    purple: 'text-neo-purple',
  };

  return (
    <div className="flex items-center justify-between bg-neo-black/20 rounded-neo px-3 py-2">
      <div className="flex items-center gap-2 text-neo-cream/70">
        <span className={colorClasses[color]}>{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={cn("font-bold", colorClasses[color])}>
        {value}
        {subValue && <span className="text-neo-cream/50 text-xs ml-1">{subValue}</span>}
      </div>
    </div>
  );
};

/**
 * Format seconds to mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default DesktopStatsPanel;
