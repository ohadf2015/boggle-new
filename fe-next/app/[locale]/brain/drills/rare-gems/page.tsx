'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import RareGems from '@/components/drills/RareGems';
import { useDrillGrid } from '@/hooks/useDrillGrid';

/**
 * Rare Gems Drill Page
 *
 * Vocabulary training drill where players discover
 * uncommon and rare words for bonus points.
 */
export default function RareGemsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { setIsInGame } = useNavigation();
  const isDarkMode = theme === 'dark';

  // Generate drill grid
  const { grid, availableWords, isLoading } = useDrillGrid(5);

  // Hide bottom nav during drill
  React.useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const handleComplete = useCallback((result: {
    score: number;
    rareWordsFound: number;
    totalWordsFound: number;
    timeSpent: number;
    level: number;
  }) => {
    // TODO: Save drill results to database
    console.log('Rare Gems completed:', result);
  }, []);

  const handleExit = useCallback(() => {
    router.push(`/${language}/brain`);
  }, [router, language]);

  const handleBack = useCallback(() => {
    router.push(`/${language}/brain`);
  }, [router, language]);

  if (isLoading || grid.length === 0) {
    return (
      <div className={cn(
        'min-h-screen flex items-center justify-center',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={cn(
            'w-12 h-12 border-4 border-t-transparent rounded-full',
            isDarkMode ? 'border-neo-green' : 'border-neo-green'
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      {/* Header */}
      <header className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b-4 border-neo-black',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <button
          onClick={handleBack}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-neo',
            'border-3 border-neo-black shadow-hard-sm',
            'transition-all hover:translate-y-[-2px] hover:shadow-hard',
            isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm hidden sm:inline">{t('common.back')}</span>
        </button>

        <h1 className={cn(
          'text-lg font-black uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.drills.rare-gems.name')}
        </h1>

        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Drill Content */}
      <div className="flex-1">
        <RareGems
          grid={grid}
          availableWords={availableWords}
          level={1}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </div>
    </div>
  );
}
