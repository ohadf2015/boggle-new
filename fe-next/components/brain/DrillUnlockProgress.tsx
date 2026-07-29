'use client';

import { m } from 'framer-motion';
import { Lock, Unlock, Shuffle, BookOpen, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DrillType } from '@/shared/types/cognitive';

interface LockedDrill {
  drillType: DrillType;
  gamesRequired: number;
  icon: LucideIcon;
  color: string;
}

interface DrillUnlockProgressProps {
  gamesPlayed: number;
}

const LOCKED_DRILLS: LockedDrill[] = [
  {
    drillType: 'pattern-switcher',
    gamesRequired: 5,
    icon: Shuffle,
    color: 'bg-neo-cyan',
  },
  {
    drillType: 'rare-gems',
    gamesRequired: 10,
    icon: BookOpen,
    color: 'bg-neo-lime',
  },
];

/**
 * DrillUnlockProgress Component
 *
 * Shows progress toward unlocking new drills with encouraging
 * milestone notifications. Addresses the Leo persona's need
 * for clear unlock requirements and progress indicators.
 */
export default function DrillUnlockProgress({
  gamesPlayed,
}: DrillUnlockProgressProps) {
  const { t } = useLanguage();

  // Find drills that are close to being unlocked (within 3 games) or just unlocked
  const relevantDrills = LOCKED_DRILLS.filter((drill) => {
    const gamesLeft = drill.gamesRequired - gamesPlayed;
    // Show if: about to unlock (1-3 games away) OR just unlocked (0 games, gamesPlayed matches exactly)
    return gamesLeft > 0 && gamesLeft <= 3;
  });

  // Find drills that were JUST unlocked (show celebration)
  const justUnlocked = LOCKED_DRILLS.filter((drill) => {
    return gamesPlayed === drill.gamesRequired;
  });

  if (relevantDrills.length === 0 && justUnlocked.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Just Unlocked Celebration */}
      {justUnlocked.map((drill) => {
        const Icon = drill.icon;
        return (
          <m.div
            key={`unlocked-${drill.drillType}`}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-neo border-2 border-neo-black',
              'bg-linear-to-r from-neo-lime/20 to-neo-cyan/20'
            )}
          >
            <m.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                type: 'tween',
                duration: 1.5,
                repeat: 3,
              }}
              className={cn(
                'w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center',
                drill.color
              )}
            >
              <Unlock className="w-5 h-5 text-neo-black" />
            </m.div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neo-lime" />
                <p className={cn(
                  'text-sm font-black uppercase',
                  'text-neo-white'
                )}>
                  {t('brain.unlock.newDrillUnlocked')}
                </p>
              </div>
              <p className={cn(
                'text-xs',
                'text-neo-white'
              )}>
                {t(`brain.drills.${drill.drillType}.name`)} {t('brain.unlock.nowAvailable')}
              </p>
            </div>

            <Icon className={cn(
              'w-6 h-6',
              'text-neo-white'
            )} />
          </m.div>
        );
      })}

      {/* Progress toward unlock */}
      {relevantDrills.map((drill) => {
        const Icon = drill.icon;
        const gamesLeft = drill.gamesRequired - gamesPlayed;
        const progress = (gamesPlayed / drill.gamesRequired) * 100;

        return (
          <m.div
            key={`progress-${drill.drillType}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-neo border-2 border-neo-black',
              'bg-neo-navy-light/50'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center relative',
              'bg-neo-cream/30'
            )}>
              <Lock className="w-5 h-5 text-neo-black/50" />
              {/* Small badge showing games left */}
              <div className={cn(
                'absolute -top-1 -right-1 w-5 h-5 rounded-full border border-neo-black',
                'flex items-center justify-center text-[10px] font-black',
                'bg-neo-lime text-neo-black'
              )}>
                {gamesLeft}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className={cn(
                  'text-xs font-bold',
                  'text-neo-white'
                )}>
                  {t(`brain.drills.${drill.drillType}.name`)}
                </p>
                <p className={cn(
                  'text-[10px] font-bold',
                  'text-neo-white'
                )}>
                  {gamesLeft} {gamesLeft === 1 ? t('brain.unlock.gameLeft') : t('brain.unlock.gamesLeft')}
                </p>
              </div>

              {/* Progress bar */}
              <div className={cn(
                'h-2 rounded-full border border-neo-black overflow-hidden',
                'bg-neo-navy-light'
              )}>
                <m.div
                  className={cn('h-full', drill.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <Icon className={cn(
              'w-5 h-5',
              'text-neo-white'
            )} />
          </m.div>
        );
      })}
    </div>
  );
}
