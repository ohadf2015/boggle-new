'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Zap, Brain, Target, Shuffle, BookOpen, Lightbulb, ArrowRight, TrendingDown, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CognitiveDomain, DrillType } from '@/shared/types/cognitive';

interface DomainScore {
  score: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface PersonalizedDrillRecommendationProps {
  domains: {
    processingSpeed: DomainScore;
    workingMemory: DomainScore;
    attention: DomainScore;
    flexibility: DomainScore;
    vocabulary: DomainScore;
  };
  gamesPlayed?: number;
}

const DOMAIN_TO_DRILL: Record<CognitiveDomain, DrillType> = {
  processingSpeed: 'lightning-round',
  workingMemory: 'memory-hunt',
  attention: 'combo-master',
  flexibility: 'pattern-switcher',
  vocabulary: 'rare-gems',
};

const DRILL_CONFIG: Record<DrillType, {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  unlockRequirement: number;
}> = {
  'lightning-round': {
    icon: Zap,
    color: 'text-neo-lime',
    bgColor: 'bg-yellow-400',
    unlockRequirement: 0,
  },
  'memory-hunt': {
    icon: Brain,
    color: 'text-neo-purple',
    bgColor: 'bg-purple-400',
    unlockRequirement: 0,
  },
  'combo-master': {
    icon: Target,
    color: 'text-neo-orange',
    bgColor: 'bg-orange-400',
    unlockRequirement: 0,
  },
  'pattern-switcher': {
    icon: Shuffle,
    color: 'text-neo-cyan',
    bgColor: 'bg-cyan-400',
    unlockRequirement: 5,
  },
  'rare-gems': {
    icon: BookOpen,
    color: 'text-lime-400',
    bgColor: 'bg-lime-400',
    unlockRequirement: 10,
  },
};

/**
 * PersonalizedDrillRecommendation Component
 *
 * Analyzes user's cognitive domain scores and recommends the most beneficial drill.
 * Prioritizes:
 * 1. Declining domains (needs immediate attention)
 * 2. Lowest scoring domains
 * 3. Stable domains that could improve
 */
export default function PersonalizedDrillRecommendation({
  domains,
  gamesPlayed = 0,
}: PersonalizedDrillRecommendationProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Find the recommended domain based on priority. Critically: skip domains
  // whose drill is still locked (gamesPlayed < unlockRequirement) so a brand-new
  // player whose weakest domain happens to be vocabulary (rare-gems, locked till
  // 10 games) doesn't get told "play 10 more games" as their primary CTA — they
  // get sent to the next-weakest *unlocked* drill instead.
  const getRecommendedDomain = (): CognitiveDomain => {
    const domainEntries = Object.entries(domains) as [CognitiveDomain, DomainScore][];

    const isDomainUnlocked = (domain: CognitiveDomain) => {
      const drill = DOMAIN_TO_DRILL[domain];
      return gamesPlayed >= DRILL_CONFIG[drill].unlockRequirement;
    };

    const unlockedEntries = domainEntries.filter(([d]) => isDomainUnlocked(d));
    // Defensive: if every drill is locked (shouldn't happen since 3 are always unlocked),
    // fall back to the full list so the user still sees something useful.
    const candidatePool = unlockedEntries.length > 0 ? unlockedEntries : domainEntries;

    // Priority 1: Declining domains (sorted by lowest score)
    const decliningDomains = candidatePool
      .filter(([, data]) => data.trend === 'declining')
      .sort((a, b) => a[1].score - b[1].score);

    if (decliningDomains.length > 0) {
      return decliningDomains[0][0];
    }

    // Priority 2: Lowest scoring domain
    const sortedByScore = [...candidatePool].sort((a, b) => a[1].score - b[1].score);
    return sortedByScore[0][0];
  };

  const recommendedDomain = getRecommendedDomain();
  const recommendedDrill = DOMAIN_TO_DRILL[recommendedDomain];
  const drillConfig = DRILL_CONFIG[recommendedDrill];
  const domainData = domains[recommendedDomain];
  const Icon = drillConfig.icon;

  const isUnlocked = gamesPlayed >= drillConfig.unlockRequirement;
  const gamesUntilUnlock = Math.max(0, drillConfig.unlockRequirement - gamesPlayed);

  const handleStartDrill = () => {
    if (isUnlocked) {
      router.push(`/${language}/brain/drills/${recommendedDrill}`);
    }
  };

  // Generate personalized message based on domain state
  const getMessage = () => {
    if (domainData.trend === 'declining') {
      return t('brain.recommendation.declining', { domain: t(`brain.domains.${recommendedDomain}`) });
    }
    if (domainData.score < 40) {
      return t('brain.recommendation.low', { domain: t(`brain.domains.${recommendedDomain}`) });
    }
    return t('brain.recommendation.improve', { domain: t(`brain.domains.${recommendedDomain}`) });
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-neo border-3 border-neo-black shadow-hard p-4',
        isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-neo-cream to-white'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          'w-8 h-8 rounded-lg border-2 border-neo-black flex items-center justify-center',
          'bg-neo-lime'
        )}>
          <Lightbulb className="w-5 h-5 text-neo-black" />
        </div>
        <h3 className={cn(
          'text-sm font-black uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.recommendation.title')}
        </h3>
      </div>

      {/* Recommendation Card */}
      <div className={cn(
        'rounded-neo border-2 border-neo-black p-3',
        isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-white'
      )}>
        {/* Domain Status */}
        <div className="flex items-center gap-2 mb-3">
          {domainData.trend === 'declining' && (
            <TrendingDown className="w-4 h-4 text-amber-400" />
          )}
          <p className={cn(
            'text-xs',
            isDarkMode ? 'text-neo-white' : 'text-neo-black/80'
          )}>
            {getMessage()}
          </p>
        </div>

        {/* Recommended Drill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center',
              drillConfig.bgColor
            )}>
              <Icon className="w-7 h-7 text-neo-black" />
            </div>
            <div>
              <p className={cn(
                'text-sm font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {t(`brain.drills.${recommendedDrill}.name`)}
              </p>
              <p className={cn(
                'text-[10px] uppercase tracking-wide',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/60'
              )}>
                {t(`brain.domains.${recommendedDomain}`)} • {domainData.score}/100
              </p>
            </div>
          </div>

          {/* Action Button */}
          {isUnlocked ? (
            <m.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartDrill}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-neo border-2 border-neo-black',
                'font-bold text-xs uppercase',
                'shadow-hard-sm hover:shadow-hard hover:translate-y-[-2px] transition-all',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.recommendation.startDrill')}
              <ArrowRight className="w-4 h-4 rtl:scale-x-[-1]" />
            </m.button>
          ) : (
            <div className={cn(
              'px-3 py-2 rounded-neo border-2 border-neo-black text-center',
              isDarkMode ? 'bg-slate-600' : 'bg-gray-100'
            )}>
              <p className={cn(
                'text-[10px] font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
              )}>
                {t('brain.recommendation.unlock', { games: gamesUntilUnlock })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scientific backing hint */}
      <p className={cn(
        'text-[10px] mt-2 text-center',
        isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
      )}>
        {t('brain.recommendation.scienceHint')}
      </p>
    </m.div>
  );
}
