'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBrainScore } from '@/hooks/useBrainScore';
import { cn } from '@/lib/utils';
import BrainScoreHero from '@/components/brain/BrainScoreHero';
import CognitiveDomainGrid from '@/components/brain/CognitiveDomainGrid';
import CognitiveRadarChart from '@/components/brain/CognitiveRadarChart';
import QuickDrillsSection from '@/components/brain/QuickDrillsSection';
import ScientificTipsCarousel from '@/components/brain/ScientificTipsCarousel';

/**
 * Header component for Brain Training page
 */
interface HeaderProps {
  isDarkMode: boolean;
  onBack: () => void;
  title: string;
  backText: string;
}

function Header({ isDarkMode, onBack, title, backText }: HeaderProps) {
  return (
    <header className={cn(
      'sticky top-0 z-40',
      'border-b-4 border-neo-black',
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-neo',
            'border-3 border-neo-black shadow-hard-sm',
            'transition-all hover:translate-y-[-2px] hover:shadow-hard',
            isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
          )}
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          <span className="font-bold text-sm hidden sm:inline">{backText}</span>
        </button>

        <h1 className={cn(
          'text-xl font-black uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {title}
        </h1>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
}

/**
 * Brain Training Dashboard
 * Displays cognitive scores, progress, and quick access to brain drills.
 */
export default function BrainTrainingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated } = useAuth();
  const { brainScore, isLoading, error, refresh, initializeBrainScore } = useBrainScore();

  const handleBack = () => {
    router.push(`/${language}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        'min-h-screen pb-24',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
          {/* Loading skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className={cn(
              'h-48 rounded-neo border-3 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-gray-200'
            )} />
            <div className={cn(
              'h-64 rounded-neo border-3 border-neo-black',
              isDarkMode ? 'bg-slate-800' : 'bg-gray-200'
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-32 rounded-neo border-3 border-neo-black',
                    isDarkMode ? 'bg-slate-800' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        'min-h-screen pb-24',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <main className="px-4 py-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-center p-8 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}
          >
            <Brain className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className={cn(
              'text-xl font-bold mb-2',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.errors.loadFailed') || 'Failed to load brain score'}
            </h2>
            <p className={cn(
              'text-sm mb-6',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {error}
            </p>
            <button
              onClick={refresh}
              className={cn(
                'px-6 py-3 rounded-neo font-bold',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.errors.retry') || 'Retry'}
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  // Unauthenticated user state
  if (!isAuthenticated) {
    return (
      <div className={cn(
        'min-h-screen pb-24',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <main className="px-4 py-6 max-w-4xl mx-auto">
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
              {t('brain.guestView.title') || 'Track Your Cognitive Growth'}
            </h2>
            <p className={cn(
              'text-sm mb-6',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.guestView.description') || 'Sign in to track your brain training progress and unlock personalized cognitive insights'}
            </p>
            <button
              onClick={() => router.push(`/${language}/auth`)}
              className={cn(
                'px-6 py-3 rounded-neo font-bold',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('common.signIn') || 'Sign In'}
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  // New user state (no brain score yet)
  if (!brainScore) {
    return (
      <div className={cn(
        'min-h-screen pb-24',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
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
              {t('brain.empty.title') || 'Start Your Brain Training Journey'}
            </h2>
            <p className={cn(
              'text-sm mb-6',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.empty.description') || 'Play your first game to unlock your Brain Score and start tracking your cognitive growth!'}
            </p>
            <button
              onClick={() => router.push(`/${language}`)}
              className={cn(
                'px-6 py-3 rounded-neo font-bold',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.empty.playNow') || 'Play Now'}
            </button>
          </motion.div>

          {/* Show Quick Drills section even for new users */}
          <QuickDrillsSection />
        </main>
      </div>
    );
  }

  // Main dashboard with real data
  return (
    <div className={cn(
      'min-h-screen pb-24', // Extra padding for bottom nav
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      <Header
        isDarkMode={isDarkMode}
        onBack={handleBack}
        title={t('brain.title')}
        backText={t('common.back')}
      />

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Brain Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BrainScoreHero
            score={brainScore.overallScore}
            tier={brainScore.tier}
            tierProgress={brainScore.tierProgress}
            gamesAnalyzed={brainScore.gamesAnalyzed}
          />
        </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CognitiveRadarChart domains={brainScore.domains} />
        </motion.div>

        {/* Cognitive Domains */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <CognitiveDomainGrid domains={brainScore.domains} />
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

        {/* Empty State for Users with Zero Games */}
        {brainScore.gamesAnalyzed === 0 && (
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
              {t('brain.empty.title') || 'Start Your Journey'}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.empty.description') || 'Play more games to see your cognitive growth!'}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
