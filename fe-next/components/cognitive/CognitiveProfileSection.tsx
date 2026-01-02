'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Minus, Gamepad2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  type CognitiveProfile,
  type TrendDirection,
  COGNITIVE_DOMAIN_CONFIG,
  getScoreLevelKey,
} from '@/shared/types/cognitiveScores';
import BrainScoreDisplay from './BrainScoreDisplay';
import CognitiveRadarChart from './CognitiveRadarChart';

interface CognitiveProfileSectionProps {
  /** Cognitive profile from user profile (null if no data yet) */
  cognitiveProfile: CognitiveProfile | null;
  /** Dark mode flag */
  isDarkMode: boolean;
  /** Custom class name */
  className?: string;
  /** Compact mode for mobile */
  compact?: boolean;
}

/**
 * TrendIndicator - Shows trend direction with icon
 */
const TrendIndicator: React.FC<{
  trend: TrendDirection;
  className?: string;
}> = ({ trend, className }) => {
  if (trend === 1) {
    return <TrendingUp className={cn('w-4 h-4 text-neo-lime', className)} />;
  }
  if (trend === -1) {
    return <TrendingDown className={cn('w-4 h-4 text-neo-pink', className)} />;
  }
  return <Minus className={cn('w-4 h-4 text-gray-400', className)} />;
};

/**
 * EmptyState - Shown when user has no cognitive data
 */
const EmptyState: React.FC<{
  isDarkMode: boolean;
  t: (key: string) => string;
}> = ({ isDarkMode, t }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'text-center py-8 px-4 rounded-2xl',
      isDarkMode
        ? 'bg-slate-800/50 border border-slate-700'
        : 'bg-white border border-gray-200 shadow-lg'
    )}
  >
    <div className="mb-4">
      <div
        className={cn(
          'w-20 h-20 mx-auto rounded-full flex items-center justify-center',
          isDarkMode ? 'bg-neo-purple/20' : 'bg-neo-purple/10'
        )}
      >
        <Brain className="w-10 h-10 text-neo-purple" />
      </div>
    </div>
    <h3
      className={cn(
        'text-lg font-bold mb-2',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}
    >
      {t('cognitive.unlockBrainTraining') || 'Unlock Brain Training'}
    </h3>
    <p
      className={cn(
        'text-sm mb-4 max-w-xs mx-auto',
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      )}
    >
      {t('cognitive.playSingleplayerToUnlock') ||
        'Play singleplayer games to track your cognitive skills and see your brain score!'}
    </p>
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
        isDarkMode
          ? 'bg-neo-purple/20 text-neo-purple'
          : 'bg-neo-purple/10 text-neo-purple'
      )}
    >
      <Gamepad2 className="w-4 h-4" />
      {t('cognitive.startSingleplayer') || 'Start Singleplayer'}
    </div>
  </motion.div>
);

/**
 * CognitiveProfileSection - Displays lifetime cognitive profile on profile page
 * Shows current scores, peak scores, trends, and games analyzed
 */
const CognitiveProfileSection: React.FC<CognitiveProfileSectionProps> = ({
  cognitiveProfile,
  isDarkMode,
  className,
  compact = false,
}) => {
  const { t } = useLanguage();

  // Show empty state if no profile
  if (!cognitiveProfile || cognitiveProfile.gamesAnalyzed === 0) {
    return <EmptyState isDarkMode={isDarkMode} t={t} />;
  }

  const { currentScores, currentBrainScore, peakScores, peakBrainScore, trends, gamesAnalyzed } =
    cognitiveProfile;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      {/* Header with title and games count */}
      <div
        className={cn(
          'rounded-2xl p-4',
          isDarkMode
            ? 'bg-gradient-to-br from-violet-900/30 via-slate-800/50 to-purple-900/30 border border-violet-500/30'
            : 'bg-gradient-to-br from-violet-50 via-white to-purple-50 border border-violet-200 shadow-lg'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'p-2 rounded-neo border-2',
                isDarkMode
                  ? 'bg-neo-purple/30 border-neo-purple'
                  : 'bg-neo-purple/20 border-neo-purple'
              )}
            >
              <Brain className="w-5 h-5 text-neo-purple" />
            </div>
            <div>
              <h2
                className={cn(
                  'font-bold text-lg',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}
              >
                {t('cognitive.brainTraining') || 'Brain Training'}
              </h2>
              <p
                className={cn(
                  'text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}
              >
                {t('cognitive.gamesAnalyzed', { count: gamesAnalyzed }) ||
                  `${gamesAnalyzed} games analyzed`}
              </p>
            </div>
          </div>

          {/* Overall trend indicator */}
          <div className="flex items-center gap-1">
            <TrendIndicator trend={trends.overall} />
            <span
              className={cn(
                'text-xs font-medium',
                trends.overall === 1
                  ? 'text-neo-lime'
                  : trends.overall === -1
                    ? 'text-neo-pink'
                    : isDarkMode
                      ? 'text-gray-400'
                      : 'text-gray-500'
              )}
            >
              {trends.overall === 1
                ? t('cognitive.improving') || 'Improving'
                : trends.overall === -1
                  ? t('cognitive.declining') || 'Declining'
                  : t('cognitive.stable') || 'Stable'}
            </span>
          </div>
        </div>

        {/* Main content grid */}
        <div
          className={cn(
            'grid gap-4',
            compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}
        >
          {/* Left: Brain Score + Radar Chart */}
          <div className="space-y-3">
            <BrainScoreDisplay score={currentBrainScore} animate={false} />
            <CognitiveRadarChart scores={currentScores} compact={compact} animate={false} />
          </div>

          {/* Right: Domain Scores with Trends + Peaks */}
          <div className="space-y-3">
            {/* Current Scores with Trends */}
            <div
              className={cn(
                'rounded-neo-lg border-3 border-neo-black shadow-hard p-3',
                isDarkMode ? 'bg-slate-800' : 'bg-white'
              )}
            >
              <h4
                className={cn(
                  'text-xs font-bold uppercase tracking-wide mb-2',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}
              >
                {t('cognitive.currentScores') || 'Current Scores'}
              </h4>
              <div className="space-y-2">
                {COGNITIVE_DOMAIN_CONFIG.map((domain) => {
                  const score = currentScores[domain.key];
                  const trend = trends[domain.key];
                  const levelKey = getScoreLevelKey(score);

                  return (
                    <div
                      key={domain.key}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{domain.icon}</span>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          )}
                        >
                          {t(domain.labelKey) || domain.key}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-bold text-sm',
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          )}
                        >
                          {score}
                        </span>
                        <TrendIndicator trend={trend} className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak Scores */}
            <div
              className={cn(
                'rounded-neo-lg border-3 border-neo-black shadow-hard p-3',
                isDarkMode
                  ? 'bg-gradient-to-br from-amber-900/20 to-yellow-900/20'
                  : 'bg-gradient-to-br from-amber-50 to-yellow-50'
              )}
            >
              <h4
                className={cn(
                  'text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1',
                  isDarkMode ? 'text-amber-400' : 'text-amber-700'
                )}
              >
                <span>🏆</span>
                {t('cognitive.peakScores') || 'Personal Bests'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {COGNITIVE_DOMAIN_CONFIG.map((domain) => {
                  const peak = peakScores[domain.key];
                  return (
                    <div
                      key={domain.key}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                        isDarkMode
                          ? 'bg-amber-900/30 text-amber-300'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      <span>{domain.icon}</span>
                      <span className="font-bold">{peak}</span>
                    </div>
                  );
                })}
              </div>
              <div
                className={cn(
                  'mt-2 pt-2 border-t flex items-center justify-between',
                  isDarkMode ? 'border-amber-800/50' : 'border-amber-200'
                )}
              >
                <span
                  className={cn(
                    'text-xs',
                    isDarkMode ? 'text-amber-400' : 'text-amber-700'
                  )}
                >
                  {t('cognitive.peakBrainScore') || 'Peak Brain Score'}
                </span>
                <span
                  className={cn(
                    'font-black text-lg',
                    isDarkMode ? 'text-amber-300' : 'text-amber-700'
                  )}
                >
                  {peakBrainScore}
                </span>
              </div>
            </div>

            {/* Tip/Info */}
            <div
              className={cn(
                'rounded-neo p-3 text-xs',
                isDarkMode
                  ? 'bg-slate-700/50 text-gray-400'
                  : 'bg-gray-50 text-gray-600'
              )}
            >
              <p>
                {t('cognitive.profileTip') ||
                  'Your scores are rolling averages from your last 30 games. Keep playing to improve!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CognitiveProfileSection;
