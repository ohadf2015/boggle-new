'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { Brain, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBrainScore } from '@/hooks/useBrainScore';
import { cn } from '@/lib/utils';
import BrainScoreHero from '@/components/brain/BrainScoreHero';
import CognitiveDomainGrid from '@/components/brain/CognitiveDomainGrid';
import QuickDrillsSection from '@/components/brain/QuickDrillsSection';

// Dynamic imports for chart components (Recharts is ~120KB gzipped)
// This reduces initial page load for low-end devices
const CognitiveRadarChart = dynamic(
  () => import('@/components/brain/CognitiveRadarChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-neo-navy-light/50 rounded-neo border-3 border-neo-black animate-pulse" />
    )
  }
);

const BrainScoreHistoryChart = dynamic(
  () => import('@/components/brain/BrainScoreHistoryChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-neo-navy-light/50 rounded-neo border-3 border-neo-black animate-pulse" />
    )
  }
);
import ScientificTipsCarousel from '@/components/brain/ScientificTipsCarousel';
import FirstGameCelebration from '@/components/brain/FirstGameCelebration';
import PersonalizedDrillRecommendation from '@/components/brain/PersonalizedDrillRecommendation';
import WelcomeBackCard from '@/components/brain/WelcomeBackCard';
import BrainScoreShareCard from '@/components/brain/BrainScoreShareCard';
// Sign-in modal opens only on a CTA click, far below the fold — lazy-load to keep
// its ~40KB (framer + OAuth UI) out of this route's initial parse. ssr:false: renders
// nothing when closed, so first-paint HTML is unchanged.
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
import PageLoader from '@/components/ui/PageLoader';

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
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        <button
          type="button"
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
export default function BrainTrainingPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { brainScore, recentGameScores, drillProgress, brainScoreHistory, isLoading, error, refresh } = useBrainScore();

  // Drill submission sets `lex_brain_dirty=1` in sessionStorage when the player
  // completes a drill and returns to the hub. We refresh once after initial load
  // so the radar chart and history reflect the freshly submitted scores rather
  // than stale data from the prior fetch.
  const BRAIN_DIRTY_KEY = 'lex_brain_dirty';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(BRAIN_DIRTY_KEY) === '1') {
      sessionStorage.removeItem(BRAIN_DIRTY_KEY);
      void refresh();
    }
  }, [refresh]);

  // State for first game celebration - persisted to localStorage for show-once behavior
  const FIRST_GAME_CELEBRATION_KEY = 'lexiclash_brain_first_game_celebration_shown';
  const [showCelebration, setShowCelebration] = useState(false);
  // SSR-safe: always false on server/first client render; the persisted flag is
  // read in an effect below. Reading localStorage in the useState initializer
  // makes the first client render differ from the server HTML for returning
  // users → hydration mismatch (React #418).
  const [hasShownCelebration, setHasShownCelebration] = useState(false);

  useEffect(() => {
    setHasShownCelebration(localStorage.getItem(FIRST_GAME_CELEBRATION_KEY) === 'true');
  }, []);

  // State for auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // State for share modal
  const [showShareCard, setShowShareCard] = useState(false);

  // Show celebration modal for first game (only once ever, persisted across sessions)
  useEffect(() => {
    if (brainScore && brainScore.gamesAnalyzed === 1 && !hasShownCelebration) {
      const timer = setTimeout(() => {
        setShowCelebration(true);
        setHasShownCelebration(true);
        // Persist to localStorage so it doesn't show again on page refresh
        if (typeof window !== 'undefined') {
          localStorage.setItem(FIRST_GAME_CELEBRATION_KEY, 'true');
        }
      }, 500); // Small delay for dramatic effect
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [brainScore, hasShownCelebration]);

  const handleBack = () => {
    router.push(`/${language}`);
  };

  // Calculate welcome back data (for returning users)
  const [welcomeBackData, setWelcomeBackData] = useState<{
    show: boolean;
    daysSinceLastActivity: number;
    personalBest: number | undefined;
  }>({ show: false, daysSinceLastActivity: 0, personalBest: undefined });

  useEffect(() => {
    if (!brainScore?.lastActivityAt) {
      setWelcomeBackData({ show: false, daysSinceLastActivity: 0, personalBest: undefined });
      return;
    }

    const now = Date.now();
    const lastActivity = new Date(brainScore.lastActivityAt).getTime();
    const daysSinceLastActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    const personalBest = brainScoreHistory.length > 0
      ? Math.max(...brainScoreHistory.map(h => h.overallScore))
      : undefined;

    setWelcomeBackData({
      show: daysSinceLastActivity >= 3,
      daysSinceLastActivity,
      personalBest,
    });
  }, [brainScore?.lastActivityAt, brainScoreHistory]);

  // Loading state - show PageLoader while auth is validating OR while brain score is loading
  if (authLoading || isLoading) {
    return (
      <PageLoader
        size="lg"
        text={t('brain.loading')}
        mascotVariant="thinking"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        'flex-1 flex flex-col min-h-0 page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <div className="px-4 py-6 pb-24 max-w-4xl mx-auto flex-1">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-center p-8 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
            )}
          >
            <Brain className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className={cn(
              'text-xl font-bold mb-2',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.errors.loadFailed')}
            </h2>
            <p className={cn(
              'text-sm mb-6',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
            )}>
              {error}
            </p>
            <button
              type="button"
              onClick={refresh}
              className={cn(
                'px-6 py-3 rounded-neo font-bold',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.errors.retry')}
            </button>
          </m.div>

          {/* Offline graceful-degrade: the score API may be unreachable (e.g. on a
              flight), but all 5 drills generate their boards client-side and
              submit scores via the offline queue. Surface them so the hub never
              dead-ends — the error notice above stays for context + retry. */}
          <div className="mt-6">
            <QuickDrillsSection drillProgress={drillProgress} />
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated user state
  if (!isAuthenticated) {
    return (
      <div className={cn(
        'flex-1 flex flex-col min-h-0 page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <div className="px-4 py-6 pb-24 max-w-4xl mx-auto flex-1">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-center p-8 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
            )}
          >
            <Brain className="w-16 h-16 mx-auto mb-4 text-neo-cyan" />
            <h2 className={cn(
              'text-xl font-bold mb-2',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t('brain.guestView.title')}
            </h2>
            <p className={cn(
              'text-sm mb-6',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
            )}>
              {t('brain.guestView.description')}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => { setAuthModalMode('signup'); setShowAuthModal(true); }}
                className={cn(
                  'px-6 py-3 rounded-neo font-bold',
                  'border-3 border-neo-black shadow-hard',
                  'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                  'bg-neo-lime text-neo-black'
                )}
              >
                {t('auth.signUp')}
              </button>
              <button
                type="button"
                onClick={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
                className={cn(
                  'px-6 py-3 rounded-neo font-bold',
                  'border-3 border-neo-black shadow-hard',
                  'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                  'bg-neo-cyan text-neo-black'
                )}
              >
                {t('auth.signIn')}
              </button>
            </div>
          </m.div>

          {/* Audit H2 — anonymous /brain showed only the sign-in card and 95%
              empty viewport on desktop. Surface the drill grid below the CTA
              so guests see what's available. QuickDrillsSection is auth-aware
              (gamesPlayed=0 for guests → 3 unlocked + 2 locked previews). */}
          <div className="mt-6">
            <QuickDrillsSection />
          </div>

          {/* Auth Modal */}
          {showAuthModal && (
            <AuthModal
              isOpen
              onClose={() => setShowAuthModal(false)}
              showGuestStats={true}
              initialMode={authModalMode}
            />
          )}
        </div>
      </div>
    );
  }

  // New user state (no brain score yet)
  if (!brainScore) {
    return (
      <div className={cn(
        'flex-1 flex flex-col min-h-0 page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <Header
          isDarkMode={isDarkMode}
          onBack={handleBack}
          title={t('brain.title')}
          backText={t('common.back')}
        />
        <div className="px-4 py-6 pb-24 space-y-6 max-w-4xl mx-auto flex-1">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-center p-8 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
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
              'text-sm mb-6',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
            )}>
              {t('brain.empty.description')}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/${language}`)}
              className={cn(
                'px-6 py-3 rounded-neo font-bold',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.empty.playNow')}
            </button>
          </m.div>

          {/* Show Quick Drills section even for new users */}
          <QuickDrillsSection drillProgress={drillProgress} />
        </div>
      </div>
    );
  }

  // Main dashboard with real data
  return (
    <div className={cn(
      'flex-1 flex flex-col min-h-0 page-content-safe', // Extra padding for bottom nav
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      <Header
        isDarkMode={isDarkMode}
        onBack={handleBack}
        title={t('brain.title')}
        backText={t('common.back')}
      />

      {/* Main Content — PLAY-FIRST order: the drill picker is the primary
          action and leads the page. Score + cognitive analytics follow below
          for players who want to dig in. (2026-06-13 impeccable overhaul) */}
      <div className="px-4 py-6 pb-24 space-y-6 max-w-4xl mx-auto flex-1">
        {/* Personalized "play this next" nudge — a single targeted CTA that
            sits directly above the full picker to guide the weakest domain. */}
        {brainScore.gamesAnalyzed >= 1 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PersonalizedDrillRecommendation
              domains={brainScore.domains}
              gamesPlayed={brainScore.gamesAnalyzed}
            />
          </m.div>
        )}

        {/* Quick Drills — THE ACTION. First thing the player sees + taps. */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <QuickDrillsSection drillProgress={drillProgress} />
        </m.div>

        {/* Welcome Back Card (for returning users after 3+ days) */}
        {welcomeBackData.show && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <WelcomeBackCard
              daysSinceLastActivity={welcomeBackData.daysSinceLastActivity}
              currentScore={brainScore.overallScore}
              personalBest={welcomeBackData.personalBest}
              currentTier={brainScore.tier}
              currentStreak={brainScore.currentStreak}
              longestStreak={brainScore.longestStreak}
            />
          </m.div>
        )}

        {/* Brain Score Hero — your standings, demoted below the action. */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <BrainScoreHero
            score={brainScore.overallScore}
            tier={brainScore.tier}
            tierProgress={brainScore.tierProgress}
            gamesAnalyzed={brainScore.gamesAnalyzed}
            drillsCompleted={brainScore.drillsCompleted}
            onShare={() => setShowShareCard(true)}
          />
        </m.div>

        {/* Radar Chart */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <CognitiveRadarChart domains={brainScore.domains} />
        </m.div>

        {/* Cognitive Domains */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <CognitiveDomainGrid
            domains={brainScore.domains}
            gamesAnalyzed={brainScore.gamesAnalyzed}
            recentGameScores={recentGameScores}
          />
        </m.div>

        {/* Progress History Chart - only show if there's meaningful history */}
        {brainScoreHistory.length >= 2 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <BrainScoreHistoryChart history={brainScoreHistory} />
          </m.div>
        )}

        {/* Scientific Tips */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <ScientificTipsCarousel />
        </m.div>
        {/* The global bottom banner is the app-wide AnchoredNativeBanner, pinned
            to the viewport bottom on this hub via the admob-routes allowlist —
            NOT an in-flow slot (which scrolled with the content). The content
            container reserves the fixed-bottom stack (nav + banner) via
            body.screen-fit, so nothing is hidden behind it. */}
      </div>

      {/* First Game Celebration Modal */}
      {brainScore && (
        <FirstGameCelebration
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          overallScore={brainScore.overallScore}
          tier={brainScore.tier}
          domains={{
            processingSpeed: brainScore.domains.processingSpeed.score,
            workingMemory: brainScore.domains.workingMemory.score,
            attention: brainScore.domains.attention.score,
            flexibility: brainScore.domains.flexibility.score,
            vocabulary: brainScore.domains.vocabulary.score,
          }}
        />
      )}

      {/* Brain Score Share Card Modal */}
      {brainScore && showShareCard && (
        <BrainScoreShareCard
          score={brainScore.overallScore}
          tier={brainScore.tier}
          domains={brainScore.domains}
          gamesAnalyzed={brainScore.gamesAnalyzed}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
