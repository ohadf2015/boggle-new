'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { User, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AutoHideHeader from '@/components/AutoHideHeader';
import { Button } from '@/components/ui/button';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload';
import { usePlayerCollectibles } from '@/hooks/usePlayerCollectibles';
import AuthModal from '@/components/auth/AuthModal';
import EmojiAvatarPicker from '@/components/EmojiAvatarPicker';
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
  const isLandscape = useMobileLandscape();
  const isDarkMode = theme === 'dark';

  // State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeGameSession, setActiveGameSession] = useState<GameSession | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
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
      toast.success(t('common.refreshed') || 'Refreshed', {
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

    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        // Dragged right (go to previous section)
        goToPrevSection();
      } else {
        // Dragged left (go to next section)
        goToNextSection();
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

  // Handle avatar save
  const handleSaveEmojiAvatar = async ({ avatarImage }: { avatarImage: string }): Promise<void> => {
    try {
      await updateProfile({
        avatar_image: avatarImage,
      });
      await refreshProfile();
      toast.success(t('profile.saved') || 'Avatar updated!');
    } catch (err) {
      console.error('Save avatar error:', err);
      toast.error(t('profile.saveError') || 'Failed to save');
    }
  };

  // Not authenticated - show sign in prompt
  if (!loading && !isAuthenticated) {
    return (
      <div className={cn(
        'flex flex-col h-full page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <User className="mx-auto text-6xl text-gray-600 mb-4" />
            <h2 className={cn('text-2xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
              {t('profile.title')}
            </h2>
            <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {t('auth.upgradePrompt')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => setShowAuthModal(true)}
                className={cn(
                  'rounded-full px-6',
                  isDarkMode
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'
                )}
              >
                {t('auth.signIn')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/${language}`)}
                className={cn(
                  'rounded-full',
                  isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                )}
              >
                <ArrowLeft className="me-2 rtl:rotate-180" />
                Back to Game
              </Button>
            </div>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} showGuestStats={true} />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'flex flex-col h-full page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="flex-1 flex items-center justify-center">
          <NeoLoader variant="mascot-letters" size="lg" />
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
    onShowEmojiPicker: () => setShowEmojiPicker(true),
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

        {/* Section header and indicator dots */}
        <div className="flex flex-col items-center pt-3 pb-2">
          <div className="text-xs font-medium text-neo-white/60 mb-2 uppercase tracking-wide">
            {t(`profile.sections.${sections[currentIndex]}`)}
          </div>
          <div className="flex items-center justify-center gap-2">
            {sections.map((section, index) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  'transition-all duration-200',
                  index === currentIndex
                    ? 'w-2.5 h-2.5 bg-neo-yellow rounded-neo border-neo border-neo-black shadow-hard-sm'
                    : 'w-2 h-2 bg-neo-white/30 rounded-neo border border-neo-black/50 hover:bg-neo-white/50'
                )}
                aria-label={`Go to ${section} section`}
              />
            ))}
          </div>
        </div>

        {/* NOTE: Do NOT use overflow-y-auto here - scroll propagates to body's screen-fit */}
        <motion.div
          className="flex-1 min-h-0 px-3 pt-2 page-content-safe relative"
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

          {/* Navigation arrows (subtle visual hints at bottom) */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrevSection}
              className={cn(
                'fixed start-2 bottom-20 z-10 opacity-40 hover:opacity-80',
                'w-10 h-10 rounded-full',
                'bg-neo-navy/80 border-2 border-neo-yellow',
                'flex items-center justify-center',
                'text-neo-yellow',
                'shadow-hard-sm',
                'transition-opacity'
              )}
              aria-label="Previous section"
            >
              <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
            </button>
          )}

          {currentIndex < sections.length - 1 && (
            <button
              onClick={goToNextSection}
              className={cn(
                'fixed end-2 bottom-20 z-10 opacity-40 hover:opacity-80',
                'w-10 h-10 rounded-full',
                'bg-neo-navy/80 border-2 border-neo-yellow',
                'flex items-center justify-center',
                'text-neo-yellow',
                'shadow-hard-sm',
                'transition-opacity'
              )}
              aria-label="Next section"
            >
              <ChevronRight className="w-6 h-6 rtl:rotate-180" />
            </button>
          )}
        </motion.div>

        <EmojiAvatarPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSave={handleSaveEmojiAvatar}
          currentAvatarImage={profile?.avatar_image}
          profileAvatar={{
            profilePictureUrl: profile?.profile_picture_url,
            avatarImage: profile?.avatar_image,
            displayName: profile?.display_name,
          }}
        />
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

        <div className={cn('flex-1 max-w-6xl mx-auto px-4 lg:px-6 w-full', isLandscape ? 'py-2' : 'py-4 lg:py-6')}>
          {/* Two-column layout on larger screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {/* Left Column: Identity & Progress */}
            <div className="space-y-4">
              <ProfileHeader {...profileHeaderProps} />
              <ProfileXpSection profile={profile} isDarkMode={isDarkMode} />
              <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} />
              {user && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
                  <ReferralCard />
                </motion.div>
              )}
            </div>

            {/* Right Column: Stats & Achievements */}
            <div className="space-y-4">
              <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} delay={0.15} />
              <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} />
              <ProfileAchievements profile={profile} isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Full-width sections below */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4">
            <ProfileCollection collectibles={playerCollectibles} isLoading={isLoadingCollectibles} isDarkMode={isDarkMode} />
          </motion.div>

          {user && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <EmailPreferences isDarkMode={isDarkMode} />
            </motion.div>
          )}

          <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
        </div>

        <EmojiAvatarPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSave={handleSaveEmojiAvatar}
          currentAvatarImage={profile?.avatar_image}
          profileAvatar={{
            profilePictureUrl: profile?.profile_picture_url,
            avatarImage: profile?.avatar_image,
            displayName: profile?.display_name,
          }}
        />
      </div>
    </>
  );
}
