'use client';

import React, { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Zap, Brain, Target, Shuffle, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { GameCognitiveScore } from '@/shared/types/cognitive';
import NewBadge from './NewBadge';
import DeltaDisplay from './DeltaDisplay';

type TrendType = 'improving' | 'stable' | 'declining';

interface DomainScore {
  score: number;
  trend: TrendType;
}

interface CognitiveDomainGridProps {
  domains: {
    processingSpeed: DomainScore;
    workingMemory: DomainScore;
    attention: DomainScore;
    flexibility: DomainScore;
    vocabulary: DomainScore;
  };
  gamesAnalyzed?: number;
  recentGameScores?: GameCognitiveScore[];
}

const DOMAIN_CONFIG = {
  processingSpeed: {
    icon: Zap,
    iconBg: 'bg-neo-lime',
    progressBar: 'bg-neo-lime',
    bgLight: 'bg-yellow-100',
    bgDark: 'bg-yellow-900/30',
  },
  workingMemory: {
    icon: Brain,
    iconBg: 'bg-purple-400',
    progressBar: 'bg-purple-400',
    bgLight: 'bg-purple-100',
    bgDark: 'bg-purple-900/30',
  },
  attention: {
    icon: Target,
    iconBg: 'bg-orange-400',
    progressBar: 'bg-orange-400',
    bgLight: 'bg-orange-100',
    bgDark: 'bg-orange-900/30',
  },
  flexibility: {
    icon: Shuffle,
    iconBg: 'bg-neo-cyan',
    progressBar: 'bg-neo-cyan',
    bgLight: 'bg-cyan-100',
    bgDark: 'bg-cyan-900/30',
  },
  vocabulary: {
    icon: BookOpen,
    iconBg: 'bg-lime-400',
    progressBar: 'bg-green-600',
    bgLight: 'bg-green-100',
    bgDark: 'bg-green-900/30',
  },
};

const TrendIcon = ({ trend }: { trend: TrendType }) => {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-lime-400" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-amber-400" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

/**
 * Calculate delta for a domain between current and previous game
 */
function calculateDomainDelta(
  domainKey: keyof typeof DOMAIN_CONFIG,
  recentScores: GameCognitiveScore[]
): number {
  if (recentScores.length < 2) return 0;

  const currentScore = recentScores[0][domainKey];
  const previousScore = recentScores[1][domainKey];

  return currentScore - previousScore;
}

/**
 * Cognitive Domain Grid Component
 * Displays the 5 cognitive domains with their scores and trends.
 */
export default function CognitiveDomainGrid({
  domains,
  gamesAnalyzed = 0,
  recentGameScores = []
}: CognitiveDomainGridProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // State to track which tooltip is open (for mobile touch support)
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  const domainEntries = Object.entries(domains) as [keyof typeof DOMAIN_CONFIG, DomainScore][];

  // Show NEW badge for game 1, delta for game 2, trends for 3+ games
  const showNewBadge = gamesAnalyzed === 1;
  const showDelta = gamesAnalyzed === 2 && recentGameScores.length >= 2;

  // Handle tooltip toggle for mobile
  const handleTooltipToggle = useCallback((domainKey: string) => {
    setOpenTooltip(prev => prev === domainKey ? null : domainKey);
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <h2 className={cn(
          'text-lg font-bold uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.cognitiveProfile')}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {domainEntries.map(([domainKey, domainData], index) => {
            const config = DOMAIN_CONFIG[domainKey];
            const Icon = config.icon;
            const isOpen = openTooltip === domainKey;

            return (
              <Tooltip
                key={domainKey}
                delayDuration={200}
                open={isOpen}
                onOpenChange={(open) => {
                  if (!open) setOpenTooltip(null);
                }}
              >
                <TooltipTrigger asChild>
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleTooltipToggle(domainKey)}
                    onMouseEnter={() => setOpenTooltip(domainKey)}
                    onMouseLeave={() => setOpenTooltip(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleTooltipToggle(domainKey);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'rounded-neo border-3 border-neo-black shadow-hard-sm p-2.5',
                      'transition-all hover:translate-y-[-2px] hover:shadow-hard cursor-pointer',
                      isDarkMode ? config.bgDark : config.bgLight
                    )}
                  >
                    {/* Icon + Title row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn(
                        'w-7 h-7 rounded-lg border-2 border-neo-black flex items-center justify-center shrink-0',
                        config.iconBg
                      )}>
                        <Icon className="w-4 h-4 text-neo-black" />
                      </div>
                      <p className={cn(
                        'text-[11px] font-bold uppercase tracking-wide line-clamp-1 flex-1',
                        isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
                      )}>
                        {t(`brain.domains.${domainKey}`)}
                      </p>
                      {showNewBadge ? (
                        <NewBadge />
                      ) : showDelta ? (
                        <DeltaDisplay delta={calculateDomainDelta(domainKey, recentGameScores)} />
                      ) : (
                        <TrendIcon trend={domainData.trend} />
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        'text-xl font-black',
                        isDarkMode ? 'text-neo-white' : 'text-neo-black'
                      )}>
                        {domainData.score}
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold',
                        isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
                      )}>
                        /100
                      </span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className={cn(
                      'h-1 mt-1.5 rounded-full border border-neo-black overflow-hidden',
                      isDarkMode ? 'bg-neo-navy-elevated' : 'bg-white'
                    )}>
                      <m.div
                        className={cn('h-full', config.progressBar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${domainData.score}%` }}
                        transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                      />
                    </div>
                  </m.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <p className="font-bold">{t(`brain.domains.${domainKey}`)}</p>
                    </div>
                    <p className="text-xs leading-relaxed">{t(`brain.domains.${domainKey}Desc`)}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-neo-black/20">
                      <span className="text-[10px] opacity-70">Score:</span>
                      <span className="text-xs font-black">{domainData.score}/100</span>
                    </div>
                    {domainData.trend !== 'stable' && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <TrendIcon trend={domainData.trend} />
                        <span className={cn(
                          domainData.trend === 'improving' ? 'text-lime-400' : 'text-amber-400'
                        )}>
                          {t(`brain.progress.${domainData.trend}`)}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
