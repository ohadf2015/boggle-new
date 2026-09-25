'use client';

import React from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getDrillTheme } from '@/lib/drills/drillThemes';
import { DRILL_ORDER } from '@/lib/drills/nextDrill';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DRILL_DOMAINS, type DrillProgress } from '@/shared/types/cognitive';

interface QuickDrillsSectionProps {
  drillProgress?: DrillProgress[];
}

const EMPTY_DRILL_PROGRESS: DrillProgress[] = [];

/**
 * Training drills grid. Every drill is open from the first visit, and each
 * card shows the adaptive level it will start at (staircase: up on a clear,
 * down after two struggles).
 */
export default function QuickDrillsSection({ drillProgress = EMPTY_DRILL_PROGRESS }: QuickDrillsSectionProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';

  return (
    <div className="space-y-3">
      <h2 className={cn('text-lg md:text-xl font-bold uppercase tracking-wide', isDarkMode ? 'text-neo-white' : 'text-neo-black')}>
        {t('brain.quickDrills')}
      </h2>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {DRILL_ORDER.map((drillId, index) => {
          const level = drillProgress.find((p) => p.drillType === drillId)?.level ?? 1;
          return (
            <m.button
              key={drillId}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/${language}/brain/drills/${drillId}`)}
              className={cn(
                'flex flex-col p-3 md:p-5 rounded-neo border-2 border-neo-black w-full transition-all relative',
                'shadow-hard-sm hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[2px] active:shadow-none',
                isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
              )}
            >
              <div className="flex items-center gap-2 md:gap-4 w-full">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-md border-2 border-neo-black overflow-hidden relative shrink-0 bg-neo-white">
                  <Image src={getDrillTheme(drillId).emblem} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <p className={cn('text-sm md:text-base font-bold text-start line-clamp-1', isDarkMode ? 'text-neo-white' : 'text-neo-black')}>
                    {t(`brain.drills.${drillId}.name`)}
                  </p>
                  <p className={cn('text-[10px] md:text-sm uppercase', isDarkMode ? 'text-neo-white' : 'text-neo-black/50')}>
                    {t(`brain.domains.${DRILL_DOMAINS[drillId]}`)}
                  </p>
                </div>
                <span
                  data-testid={`drill-level-${drillId}`}
                  aria-label={t('brain.drills.levelLabel', { level })}
                  className="shrink-0 rounded-neo border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 text-xs font-black text-neo-black"
                >
                  {level}
                </span>
              </div>
            </m.button>
          );
        })}
      </div>
    </div>
  );
}
