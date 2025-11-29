import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, TrendingUp, BarChart3, Award, Sparkles, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSpeedPatternDisplay, SPEED_PATTERNS, SpeedPattern } from '../../utils/gameInsights';
import { cn } from '../../lib/utils';

interface PlayerInsightsData {
  totalValidWords: number;
  longestWord: string;
  longestWordLength: number;
  wordsPerMinute: number;
  averageWordLength: number;
  mostCommonLength: number;
  mostCommonLengthCount: number;
  speedPattern: SpeedPattern;
  earlyGameWords: number;
  midGameWords: number;
  lateGameWords: number;
  accuracy: number;
}

interface PlayerInsightsProps {
  insights: PlayerInsightsData;
}

interface InsightCard {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue: string | null;
  color: string;
  bgColor: string;
}

/**
 * Generate a personalized, witty story based on player performance
 * Follows data-storytelling principles: context before content, emotional connection
 */
function generatePlayerStory(insights: PlayerInsightsData, t: (key: string) => string): { headline: string; story: string; emoji: string } {
  const {
    totalValidWords,
    longestWordLength,
    wordsPerMinute,
    averageWordLength,
    speedPattern,
    accuracy
  } = insights;

  // Determine player archetype based on stats
  const isSpeedDemon = wordsPerMinute >= 8;
  const isWordsmith = averageWordLength >= 5;
  const isSniper = accuracy >= 95 && totalValidWords >= 5;
  const isMachineGunner = totalValidWords >= 15 && accuracy < 80;
  const isBigWordHunter = longestWordLength >= 7;
  const isClutchPlayer = speedPattern === SPEED_PATTERNS.STRONG_FINISH;
  const isQuickStarter = speedPattern === SPEED_PATTERNS.FAST_START;
  const isMomentumBuilder = speedPattern === SPEED_PATTERNS.MOMENTUM;

  // Priority-based story selection (most impressive trait wins)
  if (isSpeedDemon && isSniper) {
    return {
      emoji: '🎯',
      headline: t('insights.story.precisionSpeed') || 'Precision at Speed',
      story: t('insights.story.precisionSpeedDesc') || `${wordsPerMinute} words/min with ${accuracy}% accuracy? That's elite-level wordplay.`
    };
  }

  if (isBigWordHunter && isWordsmith) {
    return {
      emoji: '🦈',
      headline: t('insights.story.bigGameHunter') || 'Big Game Hunter',
      story: t('insights.story.bigGameHunterDesc') || `Going after the big words pays off. ${longestWordLength}-letter words don't find themselves.`
    };
  }

  if (isSpeedDemon) {
    return {
      emoji: '⚡',
      headline: t('insights.story.speedDemon') || 'Speed Demon',
      story: t('insights.story.speedDemonDesc') || `${wordsPerMinute} words per minute is blazing fast. Your fingers are on fire!`
    };
  }

  if (isSniper) {
    return {
      emoji: '🎯',
      headline: t('insights.story.sharpshooter') || 'Sharpshooter',
      story: t('insights.story.sharpshooterDesc') || `${accuracy}% accuracy means you don't waste shots. Quality over quantity.`
    };
  }

  if (isMachineGunner) {
    return {
      emoji: '🔥',
      headline: t('insights.story.wordStorm') || 'Word Storm',
      story: t('insights.story.wordStormDesc') || `${totalValidWords} words submitted! Sometimes you spray and pray, but volume has its merits.`
    };
  }

  if (isClutchPlayer) {
    return {
      emoji: '🏁',
      headline: t('insights.story.clutchFinisher') || 'Clutch Finisher',
      story: t('insights.story.clutchFinisherDesc') || `You saved the best for last. Pressure makes diamonds.`
    };
  }

  if (isQuickStarter) {
    return {
      emoji: '🚀',
      headline: t('insights.story.firstBlood') || 'First Blood',
      story: t('insights.story.firstBloodDesc') || `You came out swinging. Early aggression sets the tone.`
    };
  }

  if (isMomentumBuilder) {
    return {
      emoji: '📈',
      headline: t('insights.story.slowBurn') || 'Slow Burn',
      story: t('insights.story.slowBurnDesc') || `Started slow, ended strong. The tortoise knew what was up.`
    };
  }

  if (isWordsmith) {
    return {
      emoji: '✨',
      headline: t('insights.story.wordsmith') || 'Wordsmith',
      story: t('insights.story.wordsmithDesc') || `Average word length of ${averageWordLength}? You don't settle for small words.`
    };
  }

  // Default fallback - always find something positive
  if (totalValidWords >= 10) {
    return {
      emoji: '💪',
      headline: t('insights.story.solidPerformance') || 'Solid Performance',
      story: t('insights.story.solidPerformanceDesc') || `${totalValidWords} valid words is a respectable showing. Keep at it!`
    };
  }

  return {
    emoji: '🎮',
    headline: t('insights.story.gettingStarted') || 'Warming Up',
    story: t('insights.story.gettingStartedDesc') || `Every champion started somewhere. The next round is yours!`
  };
}

/**
 * Neo-Brutalist Player Insights Component
 * Displays post-game statistics with data storytelling and witty commentary
 */
const PlayerInsights: React.FC<PlayerInsightsProps> = ({ insights }) => {
  const { t } = useLanguage();

  // Generate personalized story based on performance
  const playerStory = useMemo(() => {
    if (!insights || insights.totalValidWords === 0) return null;
    return generatePlayerStory(insights, t);
  }, [insights, t]);

  if (!insights || insights.totalValidWords === 0) {
    return null;
  }

  const speedDisplay = getSpeedPatternDisplay(insights.speedPattern);

  // Get translated speed pattern name
  const getSpeedPatternName = (pattern: SpeedPattern): string => {
    const names: Record<SpeedPattern, string> = {
      [SPEED_PATTERNS.FAST_START]: t('insights.fastStart') || 'Fast Starter',
      [SPEED_PATTERNS.STRONG_FINISH]: t('insights.strongFinish') || 'Strong Finish',
      [SPEED_PATTERNS.MOMENTUM]: t('insights.momentum') || 'Building Momentum',
      [SPEED_PATTERNS.STEADY]: t('insights.steady') || 'Steady Pace',
    };
    return names[pattern] || names[SPEED_PATTERNS.STEADY];
  };

  const insightCards: InsightCard[] = [
    {
      icon: Award,
      label: t('insights.longestWord') || 'Longest Word',
      value: insights.longestWord || '-',
      subValue: insights.longestWordLength > 0
        ? `${insights.longestWordLength} ${t('insights.letters') || 'letters'}`
        : null,
      color: 'var(--neo-purple)',
      bgColor: 'var(--neo-purple)',
    },
    {
      icon: Zap,
      label: t('insights.wordsPerMinute') || 'Words/Min',
      value: insights.wordsPerMinute,
      subValue: null,
      color: 'var(--neo-cyan)',
      bgColor: 'var(--neo-cyan)',
    },
    {
      icon: BarChart3,
      label: t('insights.avgWordLength') || 'Avg Length',
      value: insights.averageWordLength,
      subValue: t('insights.letters') || 'letters',
      color: 'var(--neo-orange)',
      bgColor: 'var(--neo-orange)',
    },
    {
      icon: Target,
      label: t('insights.favoriteLength') || 'Favorite Length',
      value: insights.mostCommonLength
        ? `${insights.mostCommonLength} ${t('insights.letters') || 'letters'}`
        : '-',
      subValue: insights.mostCommonLengthCount > 0
        ? `${insights.mostCommonLengthCount}x`
        : null,
      color: 'var(--neo-pink)',
      bgColor: 'var(--neo-pink)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-4 pt-4 border-t-3 border-neo-black/20"
    >
      {/* Player Story Card - The headline insight */}
      {playerStory && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-4 p-4 rounded-neo border-3 border-neo-black',
            'bg-gradient-to-br from-neo-purple to-neo-purple-light',
            'shadow-hard relative overflow-hidden'
          )}
        >
          {/* Subtle halftone pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, var(--neo-cream) 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="text-2xl"
              >
                {playerStory.emoji}
              </motion.span>
              <h3 className="text-lg font-black text-neo-cream uppercase tracking-wide">
                {playerStory.headline}
              </h3>
              <Sparkles className="w-4 h-4 text-neo-yellow ml-auto" />
            </div>
            <p className="text-sm font-bold text-neo-cream/90 leading-relaxed">
              {playerStory.story}
            </p>
          </div>
        </motion.div>
      )}

      <h4 className="text-sm font-black uppercase tracking-wide text-gray-700 mb-3">
        {t('insights.yourStats') || 'Your Stats'}
      </h4>

      {/* 2x2 Grid of stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {insightCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={cn(
                'p-3 rounded-neo border-2 border-neo-black',
                'bg-white shadow-hard-sm',
                'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard',
                'transition-all duration-100'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center border-2 border-neo-black"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <Icon className="w-3.5 h-3.5 text-black" />
                </div>
                <span className="text-[10px] font-bold uppercase text-gray-600 truncate">
                  {card.label}
                </span>
              </div>
              <div className="text-lg font-black text-gray-900 truncate">
                {card.value}
              </div>
              {card.subValue && (
                <div className="text-xs font-bold text-gray-500">
                  {card.subValue}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Speed Pattern - Full width card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn(
          'mt-2 p-3 rounded-neo border-2 border-neo-black',
          'bg-white shadow-hard-sm'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center border-2 border-neo-black"
              style={{ backgroundColor: speedDisplay.color }}
            >
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-600 block">
                {t('insights.speedPattern') || 'Speed Pattern'}
              </span>
              <span className="text-sm font-black text-gray-900">
                {speedDisplay.icon} {getSpeedPatternName(insights.speedPattern)}
              </span>
            </div>
          </div>

          {/* Speed breakdown */}
          <div className="flex gap-1 text-[10px] font-bold text-gray-800">
            <span
              className="px-1.5 py-0.5 rounded border border-gray-400 bg-neo-lime/50"
              title={t('insights.early') || 'Early'}
            >
              {t('insights.early') || 'E'}: {insights.earlyGameWords}
            </span>
            <span
              className="px-1.5 py-0.5 rounded border border-gray-400 bg-neo-cyan/50"
              title={t('insights.mid') || 'Mid'}
            >
              {t('insights.mid') || 'M'}: {insights.midGameWords}
            </span>
            <span
              className="px-1.5 py-0.5 rounded border border-gray-400 bg-neo-orange/50"
              title={t('insights.late') || 'Late'}
            >
              {t('insights.late') || 'L'}: {insights.lateGameWords}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Accuracy indicator */}
      {insights.accuracy < 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-[10px] font-bold text-gray-600 text-center"
        >
          {t('insights.accuracy') || 'Accuracy'}: {insights.accuracy}%
        </motion.div>
      )}
    </motion.div>
  );
};

export default PlayerInsights;
