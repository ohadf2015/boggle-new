'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Brain, Target, Shuffle, BookOpen, Lock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Drill {
  id: string;
  icon: React.ElementType;
  domain: string;
  color: string;
  bgColor: string;
  unlockRequirement: number; // Number of games required to unlock
}

const DRILLS: Drill[] = [
  {
    id: 'lightning-round',
    icon: Zap,
    domain: 'processingSpeed',
    color: 'text-neo-yellow',
    bgColor: 'bg-yellow-400',
    unlockRequirement: 0, // Always unlocked
  },
  {
    id: 'memory-hunt',
    icon: Brain,
    domain: 'workingMemory',
    color: 'text-neo-purple',
    bgColor: 'bg-purple-400',
    unlockRequirement: 0, // Always unlocked
  },
  {
    id: 'combo-master',
    icon: Target,
    domain: 'attention',
    color: 'text-neo-orange',
    bgColor: 'bg-orange-400',
    unlockRequirement: 0, // Always unlocked
  },
  {
    id: 'pattern-switcher',
    icon: Shuffle,
    domain: 'flexibility',
    color: 'text-neo-cyan',
    bgColor: 'bg-cyan-400',
    unlockRequirement: 5, // Unlock after 5 games
  },
  {
    id: 'rare-gems',
    icon: BookOpen,
    domain: 'vocabulary',
    color: 'text-lime-400',
    bgColor: 'bg-lime-400',
    unlockRequirement: 10, // Unlock after 10 games
  },
];

/**
 * Quick Drills Section
 * Horizontal scroll list of brain training drills with unlock status.
 */
export default function QuickDrillsSection() {
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
          'text-lg font-bold uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.quickDrills')}
        </h2>

        {/* Horizontal Scroll Container */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {DRILLS.map((drill, index) => {
              const Icon = drill.icon;
              const isUnlocked = gamesPlayed >= drill.unlockRequirement;
              const gamesRemaining = Math.max(0, drill.unlockRequirement - gamesPlayed);

              const progressPercent = drill.unlockRequirement > 0 
                ? Math.min(100, (gamesPlayed / drill.unlockRequirement) * 100)
                : 100;

              const drillButton = (
                <motion.button
                  key={drill.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleDrillClick(drill, isUnlocked)}
                  disabled={!isUnlocked}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-neo border-3 border-neo-black',
                    'min-w-[100px] transition-all relative',
                    isUnlocked
                      ? 'shadow-hard-sm hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[2px] active:shadow-none'
                      : 'opacity-75 cursor-not-allowed',
                    isDarkMode ? 'bg-slate-800' : 'bg-white'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-lg border-2 border-neo-black flex items-center justify-center mb-2 relative',
                    drill.bgColor
                  )}>
                    <Icon className="w-6 h-6 text-neo-black" />
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <p className={cn(
                    'text-xs font-bold text-center line-clamp-2',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black'
                  )}>
                    {t(`brain.drills.${drill.id}.name`)}
                  </p>

                  <p className={cn(
                    'text-[10px] uppercase mt-1',
                    isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
                  )}>
                    {t(`brain.domains.${drill.domain}`)}
                  </p>

                  {/* Progress indicator for locked drills */}
                  {!isUnlocked && drill.unlockRequirement > 0 && (
                    <div className="w-full mt-2">
                      <div className={cn(
                        'h-1.5 rounded-full border border-neo-black overflow-hidden',
                        isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                      )}>
                        <motion.div
                          className={cn('h-full', drill.bgColor)}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className={cn(
                        'text-[9px] text-center mt-0.5 font-bold',
                        isDarkMode ? 'text-neo-white/60' : 'text-neo-black/60'
                      )}>
                        {gamesPlayed}/{drill.unlockRequirement}
                      </p>
                    </div>
                  )}
                </motion.button>
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
                            {t('brain.drills.unlockHint') || 'Play more games to unlock this drill!'}
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
      </div>
    </TooltipProvider>
  );
}
