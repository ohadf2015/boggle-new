'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import BrainScoreHero from '@/components/brain/BrainScoreHero';
import CognitiveDomainGrid from '@/components/brain/CognitiveDomainGrid';
import QuickDrillsSection from '@/components/brain/QuickDrillsSection';
import ScientificTipsCarousel from '@/components/brain/ScientificTipsCarousel';

/**
 * Brain Training Dashboard
 * Displays cognitive scores, progress, and quick access to brain drills.
 */
export default function BrainTrainingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Mock data for initial UI - will be replaced with real data from hooks
  const mockBrainScore = {
    overall: 62,
    tier: 'advanced' as const,
    tierProgress: 45,
    gamesAnalyzed: 47,
    domains: {
      processingSpeed: { score: 71, trend: 'improving' as const },
      workingMemory: { score: 58, trend: 'stable' as const },
      attention: { score: 65, trend: 'improving' as const },
      flexibility: { score: 52, trend: 'declining' as const },
      vocabulary: { score: 68, trend: 'stable' as const },
    },
  };

  const handleBack = () => {
    router.push(`/${language}`);
  };

  return (
    <div className={cn(
      'min-h-screen pb-24', // Extra padding for bottom nav
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      {/* Custom Header */}
      <header className={cn(
        'sticky top-0 z-40',
        'border-b-4 border-neo-black',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-neo',
              'border-3 border-neo-black shadow-hard-sm',
              'transition-all hover:translate-y-[-2px] hover:shadow-hard',
              isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
            )}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="font-bold text-sm hidden sm:inline">{t('common.back')}</span>
          </button>

          <h1 className={cn(
            'text-xl font-black uppercase tracking-wide',
            isDarkMode ? 'text-neo-white' : 'text-neo-black'
          )}>
            {t('brain.title')}
          </h1>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Brain Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BrainScoreHero
            score={mockBrainScore.overall}
            tier={mockBrainScore.tier}
            tierProgress={mockBrainScore.tierProgress}
            gamesAnalyzed={mockBrainScore.gamesAnalyzed}
          />
        </motion.div>

        {/* Cognitive Domains */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CognitiveDomainGrid domains={mockBrainScore.domains} />
        </motion.div>

        {/* Quick Drills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <QuickDrillsSection />
        </motion.div>

        {/* Scientific Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <ScientificTipsCarousel />
        </motion.div>

        {/* Empty State for New Users */}
        {mockBrainScore.gamesAnalyzed === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-center p-8 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}
          >
            <Brain className="w-16 h-16 mx-auto mb-4 text-neo-cyan" />
            <h2 className={cn(
              'text-xl font-bold mb-2',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.empty.title')}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.empty.description')}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
