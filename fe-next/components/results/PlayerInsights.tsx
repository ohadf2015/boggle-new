import React, { useMemo, memo } from 'react';
import { m } from 'framer-motion';
import { Target, Zap, TrendingUp, BarChart3, Award, Sparkles, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSpeedPatternDisplay, SPEED_PATTERNS, SpeedPattern } from '../../utils/gameInsights';
import { cn } from '../../lib/utils';

interface PlayerInsightsData {
  totalValidWords?: number;
  longestWord: string | null;
  longestWordLength: number;
  wordsPerMinute: number;
  averageWordLength: number;
  mostCommonLength: number | null;
  mostCommonLengthCount: number;
  speedPattern: SpeedPattern;
  earlyGameWords: number;
  midGameWords: number;
  lateGameWords: number;
  accuracy?: number;
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
    totalValidWords = 0,
    longestWordLength,
    wordsPerMinute,
    averageWordLength,
    speedPattern,
    accuracy = 0
  } = insights;

  // Handle zero or very low performance - no compliments for non-participation
  if (totalValidWords === 0) {
    return {
      emoji: '🎯',
      headline: t('insights.story.noWords'),
      story: t('insights.story.noWordsDesc')
    };
  }

  // Very low score (1-2 words) - encouraging but honest
  if (totalValidWords <= 2) {
    return {
      emoji: '🌱',
      headline: t('insights.story.fewWords'),
      story: (t('insights.story.fewWordsDesc') || `${totalValidWords} words found. Keep playing to improve!`).replace('{totalValidWords}', String(totalValidWords))
    };
  }

  // Determine player archetype based on stats
  const isSpeedDemon = wordsPerMinute >= 8;
  const isWordsmith = averageWordLength >= 5;
  const isSniper = accuracy >= 95 && totalValidWords >= 5;
  const isMachineGunner = totalValidWords >= 15 && accuracy < 80;
  const isBigWordHunter = longestWordLength >= 7;
  const isClutchPlayer = speedPattern === SPEED_PATTERNS.STRONG_FINISH;
  const isQuickStarter = speedPattern === SPEED_PATTERNS.FAST_START;
  const isMomentumBuilder = speedPattern === SPEED_PATTERNS.MOMENTUM;
  const isFadeOut = speedPattern === SPEED_PATTERNS.FADE_OUT;
  const isMidGamePeak = speedPattern === SPEED_PATTERNS.MID_GAME_PEAK;
  const isBurstMode = speedPattern === SPEED_PATTERNS.BURST_MODE;
  const isSlowStarter = speedPattern === SPEED_PATTERNS.SLOW_STARTER;
  const isSecondWind = speedPattern === SPEED_PATTERNS.SECOND_WIND;

  // Priority-based story selection (most impressive trait wins)
  if (isSpeedDemon && isSniper) {
    return {
      emoji: '🎯',
      headline: t('insights.story.precisionSpeed'),
      story: t('insights.story.precisionSpeedDesc') || `${wordsPerMinute} words/min with ${accuracy}% accuracy? That's elite-level wordplay.`
    };
  }

  if (isBigWordHunter && isWordsmith) {
    return {
      emoji: '🦈',
      headline: t('insights.story.bigGameHunter'),
      story: t('insights.story.bigGameHunterDesc') || `Going after the big words pays off. ${longestWordLength}-letter words don't find themselves.`
    };
  }

  if (isSpeedDemon) {
    return {
      emoji: '⚡',
      headline: t('insights.story.speedDemon'),
      story: t('insights.story.speedDemonDesc') || `${wordsPerMinute} words per minute is blazing fast. Your fingers are on fire!`
    };
  }

  if (isSniper) {
    return {
      emoji: '🎯',
      headline: t('insights.story.sharpshooter'),
      story: t('insights.story.sharpshooterDesc') || `${accuracy}% accuracy means you don't waste shots. Quality over quantity.`
    };
  }

  if (isMachineGunner) {
    return {
      emoji: '🔥',
      headline: t('insights.story.wordStorm'),
      story: t('insights.story.wordStormDesc') || `${totalValidWords} words submitted! Sometimes you spray and pray, but volume has its merits.`
    };
  }

  if (isClutchPlayer) {
    return {
      emoji: '🏁',
      headline: t('insights.story.clutchFinisher'),
      story: t('insights.story.clutchFinisherDesc') || `You saved the best for last. Pressure makes diamonds.`
    };
  }

  if (isQuickStarter) {
    return {
      emoji: '🚀',
      headline: t('insights.story.firstBlood'),
      story: t('insights.story.firstBloodDesc') || `You came out swinging. Early aggression sets the tone.`
    };
  }

  if (isMomentumBuilder) {
    return {
      emoji: '📈',
      headline: t('insights.story.slowBurn'),
      story: t('insights.story.slowBurnDesc') || `Started slow, ended strong. The tortoise knew what was up.`
    };
  }

  if (isFadeOut) {
    return {
      emoji: '📉',
      headline: t('insights.story.earlyBurst'),
      story: t('insights.story.earlyBurstDesc') || `You came out guns blazing. Maybe save some firepower for later?`
    };
  }

  if (isMidGamePeak) {
    return {
      emoji: '⛰️',
      headline: t('insights.story.midGamePeak'),
      story: t('insights.story.midGamePeakDesc') || `You hit your stride in the middle. Warm-up complete, cooldown pending.`
    };
  }

  if (isBurstMode) {
    return {
      emoji: '💥',
      headline: t('insights.story.burstMode'),
      story: t('insights.story.burstModeDesc') || `One explosive phase of pure dominance. Quality over consistency!`
    };
  }

  if (isSlowStarter) {
    return {
      emoji: '🐢',
      headline: t('insights.story.slowStarter'),
      story: t('insights.story.slowStarterDesc') || `Took a minute to find your groove. Once you did, no stopping you.`
    };
  }

  if (isSecondWind) {
    return {
      emoji: '🌊',
      headline: t('insights.story.secondWind'),
      story: t('insights.story.secondWindDesc') || `A mid-game slump? Not a problem. You bounced back stronger.`
    };
  }

  if (isWordsmith) {
    return {
      emoji: '✨',
      headline: t('insights.story.wordsmith'),
      story: t('insights.story.wordsmithDesc') || `Average word length of ${averageWordLength}? You don't settle for small words.`
    };
  }

  // Default fallback - be realistic based on word count
  if (totalValidWords >= 10) {
    return {
      emoji: '💪',
      headline: t('insights.story.solidPerformance'),
      story: t('insights.story.solidPerformanceDesc') || `${totalValidWords} valid words is a respectable showing. Keep at it!`
    };
  }

  // Low word count (3-9 words) - encouraging but realistic
  if (totalValidWords >= 3) {
    return {
      emoji: '📚',
      headline: t('insights.story.buildingSkills'),
      story: (t('insights.story.buildingSkillsDesc') || `${totalValidWords} words is a start. Focus on finding more words next round!`).replace('{totalValidWords}', String(totalValidWords))
    };
  }

  // Fallback for edge cases (should be covered above but just in case)
  return {
    emoji: '🎮',
    headline: t('insights.story.gettingStarted'),
    story: t('insights.story.gettingStartedDesc')
  };
}

/**
 * Neo-Brutalist Player Insights Component
 * Displays post-game statistics with data storytelling and witty commentary
 */
const PlayerInsights = memo<PlayerInsightsProps>(({ insights }) => {
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
      [SPEED_PATTERNS.FAST_START]: t('insights.fastStart'),
      [SPEED_PATTERNS.STRONG_FINISH]: t('insights.strongFinish'),
      [SPEED_PATTERNS.MOMENTUM]: t('insights.momentum'),
      [SPEED_PATTERNS.STEADY]: t('insights.steady'),
      [SPEED_PATTERNS.FADE_OUT]: t('insights.fadeOut'),
      [SPEED_PATTERNS.MID_GAME_PEAK]: t('insights.midGamePeak'),
      [SPEED_PATTERNS.BURST_MODE]: t('insights.burstMode'),
      [SPEED_PATTERNS.SLOW_STARTER]: t('insights.slowStarter'),
      [SPEED_PATTERNS.SECOND_WIND]: t('insights.secondWind'),
    };
    return names[pattern] || names[SPEED_PATTERNS.STEADY];
  };

  const insightCards: InsightCard[] = [
    {
      icon: Award,
      label: t('insights.longestWord'),
      value: insights.longestWord || '-',
      subValue: insights.longestWordLength > 0
        ? `${insights.longestWordLength} ${t('insights.letters')}`
        : null,
      color: 'var(--neo-pink)',
      bgColor: 'var(--neo-pink)',
    },
    {
      icon: Zap,
      label: t('insights.wordsPerMinute'),
      value: insights.wordsPerMinute,
      subValue: null,
      color: 'var(--neo-cyan)',
      bgColor: 'var(--neo-cyan)',
    },
    {
      icon: BarChart3,
      label: t('insights.avgWordLength'),
      value: insights.averageWordLength,
      subValue: t('insights.letters'),
      color: 'var(--neo-lime)',
      bgColor: 'var(--neo-lime)',
    },
    {
      icon: Target,
      label: t('insights.favoriteLength'),
      value: insights.mostCommonLength
        ? `${insights.mostCommonLength} ${t('insights.letters')}`
        : '-',
      subValue: insights.mostCommonLengthCount > 0
        ? `${insights.mostCommonLengthCount}x`
        : null,
      color: 'var(--neo-pink)',
      bgColor: 'var(--neo-pink)',
    },
  ];

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
      className="mt-3 pt-3 border-t-3 border-neo-black/20"
    >
      {/* Player Story Card - The headline insight */}
      {playerStory && (
        <m.div
          initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
          className={cn(
            'mb-3 p-3 rounded-neo border-3 border-neo-black',
            'bg-linear-to-br from-neo-pink to-neo-pink-light',
            'shadow-hard relative overflow-hidden'
          )}
        >
          {/* Comic-style halftone pattern - subtle for featured card */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[radial-gradient(circle,var(--neo-cream)_1px,transparent_1px)] bg-size-[12px_12px]"
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <m.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
                className="text-2xl"
              >
                {playerStory.emoji}
              </m.span>
              <h3 className="text-lg font-black text-neo-white uppercase tracking-wide">
                {playerStory.headline}
              </h3>
              <Sparkles className="w-4 h-4 text-neo-lime ms-auto" />
            </div>
            <p className="text-sm font-bold text-neo-white leading-relaxed">
              {playerStory.story}
            </p>
          </div>
        </m.div>
      )}

      <h4 className="text-sm font-black uppercase tracking-wide text-foreground mb-2">
        {t('insights.yourStats')}
      </h4>

      {/* 2x2 Grid of stat cards */}
      <div className="grid grid-cols-2 gap-1.5">
        {insightCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <m.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
              className={cn(
                'p-2 rounded-neo border-2 border-neo-black',
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
                <div className="text-xs font-bold text-gray-600">
                  {card.subValue}
                </div>
              )}
            </m.div>
          );
        })}
      </div>

      {/* Speed Pattern - Full width card */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
        className={cn(
          'mt-1.5 p-2 rounded-neo border-2 border-neo-black',
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
                {t('insights.speedPattern')}
              </span>
              <span className="text-sm font-black text-gray-900">
                {speedDisplay.icon} {getSpeedPatternName(insights.speedPattern)}
              </span>
            </div>
          </div>

          {/* Speed breakdown */}
          <div className="flex gap-1 text-[10px] font-bold text-gray-800">
            <span
              className="px-1.5 py-0.5 rounded border border-gray-400 bg-neo-lime/50 text-neo-black"
              title={t('insights.early')}
            >
              {t('insights.early')}: {insights.earlyGameWords}
            </span>
            <span
              className="px-1.5 py-0.5 rounded border border-gray-400 bg-neo-cyan/50 text-neo-black"
              title={t('insights.mid')}
            >
              {t('insights.mid')}: {insights.midGameWords}
            </span>
            <span
              className="px-1.5 py-0.5 rounded border border-gray-400 bg-neo-lime/50 text-neo-black"
              title={t('insights.late')}
            >
              {t('insights.late')}: {insights.lateGameWords}
            </span>
          </div>
        </div>
      </m.div>

      {/* Accuracy indicator */}
      {insights.accuracy !== undefined && insights.accuracy < 100 && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 26 }}
          className="mt-1.5 text-[10px] font-bold text-foreground/90 text-center"
        >
          {t('insights.accuracy')}: {insights.accuracy}%
        </m.div>
      )}
    </m.div>
  );
});

PlayerInsights.displayName = 'PlayerInsights';

export default PlayerInsights;
