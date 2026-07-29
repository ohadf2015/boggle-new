'use client';

import React from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { Lock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getDrillTheme } from '@/lib/drills/drillThemes';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DrillUnlockProgress from './DrillUnlockProgress';
import type { DrillProgress, DrillType } from '@/shared/types/cognitive';

interface Drill {
  id: DrillType;
  domain: string;
  color: string;
  bgColor: string;
  unlockRequirement: number; // Number of games required to unlock
}

const DRILLS: Drill[] = [
  {
    id: 'lightning-round',
    domain: 'processingSpeed',
    color: 'text-neo-lime',
    bgColor: 'bg-yellow-400',
    unlockRequirement: 0, // Always unlocked
  },
  {
    id: 'memory-hunt',
    domain: 'workingMemory',
    color: 'text-neo-purple',
    bgColor: 'bg-purple-400',
    unlockRequirement: 0, // Always unlocked
  },
  {
    id: 'combo-master',
    domain: 'attention',
    color: 'text-neo-orange',
    bgColor: 'bg-orange-400',
    unlockRequirement: 0, // Always unlocked
  },
  {
    id: 'pattern-switcher',
    domain: 'flexibility',
    color: 'text-neo-cyan',
    bgColor: 'bg-cyan-400',
    unlockRequirement: 5, // Unlock after 5 games
  },
  {
    id: 'rare-gems',
    domain: 'vocabulary',
    color: 'text-lime-400',
    bgColor: 'bg-lime-400',
    unlockRequirement: 10, // Unlock after 10 games
  },
];

interface QuickDrillsSectionProps {
  drillProgress?: DrillProgress[];
}

const EMPTY_DRILL_PROGRESS: DrillProgress[] = [];

/**
 * Quick Drills Section
 * Grid of brain training drills with unlock status.
 */
export default function QuickDrillsSection({ drillProgress: _drillProgress = EMPTY_DRILL_PROGRESS }: QuickDrillsSectionProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const isDarkMode = theme === 'dark';

  // Get games played count from profile
  const gamesPlayed = profile?.total_games || 0;

  const handleDrillClick = (drill: Drill, isUnlocked: boolean) => {
    if (isUnlocked) {
      router.push(`/${language}/brain/drills/${drill.id}`);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <h2 className={cn(
          'text-lg md:text-xl font-bold uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.quickDrills')}
        </h2>

        {/* Drill Unlock Progress Notifications */}
        <DrillUnlockProgress gamesPlayed={gamesPlayed} />

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {DRILLS.map((drill, index) => {
            const isUnlocked = gamesPlayed >= drill.unlockRequirement;
            const gamesRemaining = Math.max(0, drill.unlockRequirement - gamesPlayed);

            const progressPercent = drill.unlockRequirement > 0
              ? Math.min(100, (gamesPlayed / drill.unlockRequirement) * 100)
              : 100;

            const drillButton = (
              <m.button
                key={drill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleDrillClick(drill, isUnlocked)}
                disabled={!isUnlocked}
                className={cn(
                  'flex flex-col p-3 md:p-5 rounded-neo border-2 border-neo-black',
                  'w-full transition-all relative',
                  isUnlocked
                    ? 'shadow-hard-sm hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[2px] active:shadow-none'
                    : 'opacity-75 cursor-not-allowed',
                  isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
                )}
              >
                {/* Header row with icon and title */}
                <div className="flex items-center gap-2 md:gap-4 w-full">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-md border-2 border-neo-black overflow-hidden relative shrink-0 bg-neo-white">
                    <Image
                      src={getDrillTheme(drill.id).emblem}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                        <Lock className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <p className={cn(
                      'text-sm md:text-base font-bold text-start line-clamp-1',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black'
                    )}>
                      {t(`brain.drills.${drill.id}.name`)}
                    </p>

                    <p className={cn(
                      'text-[10px] md:text-sm uppercase',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
                    )}>
                      {t(`brain.domains.${drill.domain}`)}
                    </p>
                  </div>
                </div>

                {/* Progress indicator for locked drills */}
                {!isUnlocked && drill.unlockRequirement > 0 && (
                  <div className="w-full mt-2 md:mt-3">
                    <div className={cn(
                      'h-1.5 md:h-2 rounded-full border border-neo-black overflow-hidden',
                      isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-200'
                    )}>
                      <m.div
                        className={cn('h-full', drill.bgColor)}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className={cn(
                      'text-[10px] md:text-xs text-center mt-1 font-bold',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black/60'
                    )}>
                      {gamesPlayed}/{drill.unlockRequirement} {t('brain.drills.gamesToUnlock')}
                    </p>
                  </div>
                )}
              </m.button>
            );

            // Wrap locked drills in enhanced tooltip
            if (!isUnlocked) {
              return (
                <Tooltip key={drill.id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    {drillButton}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <p className="font-bold">{t('brain.drills.locked')}</p>
                      </div>
                      <p className="text-xs">
                        {t('brain.drills.unlockRequirement', { games: gamesRemaining })}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-neo-black/20">
                        <Info className="w-3 h-3" />
                        <p className="text-[10px] opacity-80">
                          {t('brain.drills.unlockHint')}
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return drillButton;
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
