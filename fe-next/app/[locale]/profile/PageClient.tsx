'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { User, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageLoader } from '@/components/ui/PageLoader';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AutoHideHeader from '@/components/AutoHideHeader';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload';
import { usePlayerCollectibles } from '@/hooks/usePlayerCollectibles';
import AuthModal from '@/components/auth/AuthModal';
import { ReferralCard } from '@/components/profile/ReferralCard';
import { EmailPreferences } from '@/components/settings/EmailPreferences';
import { cn } from '@/lib/utils';
import { getSession } from '@/utils/session';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

// Profile components
import {
  ProfileHeader,
  ProfileXpSection,
  ProfileStatsGrid,
  ProfileCoinsSection,
  ProfileRankedProgress,
  ProfileAchievements,
  ProfileCollection,
  ProfileBackButtons,
} from '@/components/profile';

interface GameSession {
  gameCode?: string;
}

type ProfileSection = 'overview' | 'stats' | 'achievements' | 'collection';

export default function ProfilePageClient(): React.JSX.Element {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isAuthenticated, loading, canPlayRanked, gamesUntilRanked, updateProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLandscape = useMobileLandscape();
  const isDarkMode = theme === 'dark';

  // Read initial tab from URL query parameter (e.g., ?tab=collection)
  const getInitialSection = (): ProfileSection => {
    const tabParam = searchParams.get('tab');
    const validTabs: ProfileSection[] = ['overview', 'stats', 'achievements', 'collection'];
    if (tabParam && validTabs.includes(tabParam as ProfileSection)) {
      return tabParam as ProfileSection;
    }
    return 'overview';
  };

  // State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeGameSession, setActiveGameSession] = useState<GameSession | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>(getInitialSection);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);

  // Hooks
  const { isUploading, handleProfilePictureUpload, handleRemoveProfilePicture } = useProfilePictureUpload({
    userId: user?.id,
    profile,
    updateProfile,
    refreshProfile
  });

  const { collectibles: playerCollectibles, isLoading: isLoadingCollectibles } = usePlayerCollectibles(user?.id);

  // Pull-to-refresh
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      await refreshProfile();
      toast.success(t('common.refreshed'), {
        duration: 2000,
      });
    },
    threshold: 60,
  });

  // Section navigation
  const sections: ProfileSection[] = ['overview', 'stats', 'achievements', 'collection'];
  const currentIndex = sections.indexOf(activeSection);

  const goToNextSection = () => {
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1]);
    }
  };

  const goToPrevSection = () => {
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1]);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50; // Minimum drag distance to trigger navigation
    const isRtl = language === 'he'; // Hebrew is RTL

    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        // Dragged right: In LTR = previous, In RTL = next
        if (isRtl) {
          goToNextSection();
        } else {
          goToPrevSection();
        }
      } else {
        // Dragged left: In LTR = next, In RTL = previous
        if (isRtl) {
          goToPrevSection();
        } else {
          goToNextSection();
        }
      }
    }
  };

  // Check for active game session on mount
  useEffect(() => {
    const session = getSession();
    if (session && session.gameCode) {
      setActiveGameSession(session);
    }
  }, []);


  // Not authenticated - show sign in prompt
  if (!loading && !isAuthenticated) {
    return (
      <div className={cn(
        'flex flex-col h-full page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        {/* Reduced padding for unauthenticated view */}
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center py-6 sm:py-8">
            <User className="mx-auto text-6xl text-gray-600 mb-4" />
            <h2 className={cn('text-2xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
              {t('profile.title')}
            </h2>
            <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {t('auth.upgradePrompt')}
            </p>
            <div className="flex gap-4 justify-center">
              <EnhancedButton
                onClick={() => setShowAuthModal(true)}
                variant="cyan"
                haptic
                animation="pop"
              >
                {t('auth.signIn')}
              </EnhancedButton>
              <EnhancedButton
                variant="outline"
                onClick={() => router.push(`/${language}`)}
                haptic
              >
                <ArrowLeft className="me-2 rtl:rotate-180" />
                Back to Game
              </EnhancedButton>
            </div>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} showGuestStats={true} />
      </div>
    );
  }

  // Loading state with skeletons
  if (loading) {
    return (
      <div className={cn(
        'flex flex-col h-full page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="max-w-4xl mx-auto px-4 py-6 w-full">
          {/* Profile header skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
          {/* Content skeleton */}
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Shared props for profile components
  const profileHeaderProps = {
    profile,
    isDarkMode,
    isUploading,
    onProfilePictureUpload: handleProfilePictureUpload,
    onRemoveProfilePicture: handleRemoveProfilePicture,
    updateProfile,
    refreshProfile
  };

  // Authenticated profile view
  return (
    <>
      {/* ===== MOBILE VIEW ===== */}
      {/* NOTE: Do NOT use h-full here - it creates nested scroll containers with body's screen-fit */}
      {/* Scroll is handled at body level via screen-fit class. This container just provides flex layout. */}
      <div className={cn(
        'md:hidden flex-1 flex flex-col min-h-0 relative',
        isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />

        {/* Tab navigation for mobile */}
        <div className="flex items-center justify-center px-2 pt-3 pb-2">
          <div className="flex items-center gap-1 bg-neo-navy/80 border-2 border-neo-black rounded-neo p-1">
            {sections.map((section, index) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  'px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-neo transition-all duration-150',
                  index === currentIndex
                    ? 'bg-neo-yellow text-neo-black border-2 border-neo-black shadow-hard-sm'
                    : 'text-neo-white/70 hover:text-neo-white hover:bg-neo-white/10'
                )}
                aria-label={`Go to ${section} section`}
                aria-selected={index === currentIndex}
                role="tab"
              >
                {t(`profile.sections.${section}`)}
              </button>
            ))}
          </div>
        </div>

        {/* NOTE: Do NOT use overflow-y-auto here - scroll propagates to body's screen-fit */}
        <div className="flex-1 min-h-0 relative">
          {/* Swipe indicator - left side (use logical start for RTL support) */}
          {currentIndex > 0 && (
            <div
              className="absolute start-0 top-0 bottom-0 w-6 z-10 pointer-events-none bg-gradient-to-r rtl:bg-gradient-to-l from-neo-navy/60 to-transparent flex items-center justify-start ps-1"
              aria-hidden="true"
            >
              <ChevronLeft className="w-4 h-4 text-neo-yellow/60 rtl:rotate-180" />
            </div>
          )}

          {/* Swipe indicator - right side (use logical end for RTL support) */}
          {currentIndex < sections.length - 1 && (
            <div
              className="absolute end-0 top-0 bottom-0 w-6 z-10 pointer-events-none bg-gradient-to-l rtl:bg-gradient-to-r from-neo-navy/60 to-transparent flex items-center justify-end pe-1"
              aria-hidden="true"
            >
              <ChevronRight className="w-4 h-4 text-neo-yellow/60 rtl:rotate-180" />
            </div>
          )}

          <motion.div
            className="h-full px-5 pt-2 pb-24 sm:pb-0 page-content-safe"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            {...pullToRefreshHandlers}
          >
            <PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={60} />

          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileHeader {...profileHeaderProps} compact />
                <ProfileXpSection profile={profile} isDarkMode={isDarkMode} compact />
                <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} compact />
                <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
              </motion.div>
            )}

            {activeSection === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} />
                <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} />
              </motion.div>
            )}

            {activeSection === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileAchievements profile={profile} isDarkMode={isDarkMode} />
              </motion.div>
            )}

            {activeSection === 'collection' && (
              <motion.div
                key="collection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {user && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-4"><ReferralCard /></motion.div>}
                <ProfileCollection collectibles={playerCollectibles} isLoading={isLoadingCollectibles} isDarkMode={isDarkMode} />
                {user && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}><EmailPreferences isDarkMode={isDarkMode} /></motion.div>}
                <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
              </motion.div>
            )}
          </AnimatePresence>

          </motion.div>
        </div>

      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div
        className={cn(
          'hidden md:flex md:flex-col md:h-full relative',
          isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
        )}
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={60} />
        <AutoHideHeader />

        {/* Single column stacked layout */}
        <div className={cn('flex-1 max-w-6xl mx-auto px-4 lg:px-6 w-full flex flex-col gap-6', isLandscape ? 'py-2' : 'py-6 lg:py-8')}>
          {/* 1. Hero Banner */}
          <ProfileHeader {...profileHeaderProps} />

          {/* 2. Stats Grid */}
          <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} delay={0.1} />

          {/* 3. XP + Coins side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfileXpSection profile={profile} isDarkMode={isDarkMode} delay={0.15} />
            <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} delay={0.18} />
          </div>

          {/* 4. Ranked Progress */}
          <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} delay={0.2} />

          {/* 5. Referral */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <ReferralCard />
            </motion.div>
          )}

          {/* 6. Achievements */}
          <ProfileAchievements profile={profile} isDarkMode={isDarkMode} delay={0.3} />

          {/* 7. Collection */}
          <ProfileCollection collectibles={playerCollectibles} isLoading={isLoadingCollectibles} isDarkMode={isDarkMode} delay={0.35} />

          {/* 8. Settings & Navigation */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <EmailPreferences isDarkMode={isDarkMode} />
            </motion.div>
          )}

          <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
        </div>

      </div>
    </>
  );
}
