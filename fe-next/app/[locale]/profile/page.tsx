'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowLeft, Edit, Gamepad2, Trophy, Star, Camera, X, Check, Clock, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AutoHideHeader from '@/components/AutoHideHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import Avatar from '@/components/Avatar';
import EmojiAvatarPicker from '@/components/EmojiAvatarPicker';
import { AchievementBadge } from '@/components/AchievementBadge';
import LevelBadge from '@/components/LevelBadge';
import XpProgressBar from '@/components/XpProgressBar';
import { uploadProfilePicture, removeProfilePicture } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import { getSession } from '@/utils/session';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

interface Achievement {
  icon: string;
  name: string;
  description: string;
}

interface GameSession {
  gameCode?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDarkMode: boolean;
  highlight?: boolean;
}

// Achievement icons mapping (matches backend achievementManager.js)
// COMPLETE list of all achievements including elite, competitive/style, and lifetime achievements
const ACHIEVEMENT_ICONS: Record<string, string> = {
  // Basic achievements
  FIRST_BLOOD: '🎯',
  SPEED_DEMON: '⚡',
  WORD_MASTER: '📚',
  COMBO_KING: '🔥',
  PERFECTIONIST: '✨',
  LEXICON: '🏆',
  WORDSMITH: '🎓',
  QUICK_THINKER: '💨',
  LONG_HAULER: '🏃',
  DIVERSE_VOCABULARY: '🌈',
  DOUBLE_TROUBLE: '⚡⚡',
  TREASURE_HUNTER: '💎',

  // Existing achievements
  TRIPLE_THREAT: '🎰',
  UNSTOPPABLE: '🚀',
  COMEBACK_KID: '🔄',
  DICTIONARY_DIVER: '📖',
  LIGHTNING_ROUND: '⚡',
  RARE_GEM: '💠',
  EXPLORER: '🧭',
  STREAK_MASTER: '🔥',
  ANAGRAM_ARTIST: '🔀',
  LETTER_POPPER: '🎈',

  // New elite achievements
  WORD_ARCHITECT: '🏛️',
  SPEED_LEGEND: '🏎️',
  COMBO_GOD: '👑',
  VOCABULARY_TITAN: '🗿',
  PRECISION_MASTER: '🎯',
  LONG_WORD_CHAIN: '🔗',

  // New competitive/style achievements
  MINIMALIST: '🎯',
  WORD_SNIPER: '🔫',
  PHOTO_FINISH: '📸',
  UNDERDOG: '🐕',
  CLUTCH_PLAYER: '💪',

  // Lifetime/career achievements (tracked across all games)
  VETERAN: '🎖️',
  CENTURION: '💯',
  WORD_COLLECTOR: '📚',
  WORD_HOARDER: '🗃️',
  CHAMPION: '🏅',
  LEGEND: '👑',
  POINT_MASTER: '💰',
  POINT_KING: '💎',
  DEDICATION: '🔥',
  LOYAL_PLAYER: '⭐',
};

// Helper to get achievement icon by key
function getAchievementIcon(key: string): string {
  return ACHIEVEMENT_ICONS[key] || '🏅';
}

// Format seconds into human-readable time (e.g., "2h 30m" or "45m")
function formatTimePlayed(totalSeconds: number | undefined | null): string {
  if (!totalSeconds || totalSeconds <= 0) return '0m';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export default function ProfilePage(): React.ReactNode {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isAuthenticated, loading, canPlayRanked, gamesUntilRanked, updateProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const isLandscape = useMobileLandscape();
  const isDarkMode = theme === 'dark';

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeGameSession, setActiveGameSession] = useState<GameSession | null>(null);

  // Check for active game session on mount
  useEffect(() => {
    const session = getSession();
    if (session && session.gameCode) {
      setActiveGameSession(session);
    }
  }, []);

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge') || 'Image must be less than 4MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('profile.invalidImageType') || 'Please upload a JPG, PNG, WebP, or GIF image');
      return;
    }

    setIsUploading(true);

    try {
      const { url, error } = await uploadProfilePicture(user.id, file);
      if (error) throw error;

      await updateProfile({
        profile_picture_url: url,
        profile_picture_provider: 'custom'
      });

      await refreshProfile();
      toast.success(t('profile.uploadSuccess') || 'Profile picture updated!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('profile.uploadError') || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle profile picture removal
  const handleRemoveProfilePicture = async (): Promise<void> => {
    if (!user?.id) return;

    try {
      if (profile?.profile_picture_provider === 'custom') {
        await removeProfilePicture(user.id);
      }

      await updateProfile({
        profile_picture_url: null,
        profile_picture_provider: null
      });

      await refreshProfile();
      toast.success(t('profile.photoRemoved') || 'Profile picture removed');
    } catch (err) {
      console.error('Remove error:', err);
      toast.error(t('profile.removeError') || 'Failed to remove picture');
    }
  };

  // Handle display name save
  const handleSaveDisplayName = async (): Promise<void> => {
    if (!editDisplayName.trim() || editDisplayName.trim().length < 2) {
      toast.error(t('validation.usernameTooShort') || 'Name must be at least 2 characters');
      return;
    }

    if (editDisplayName.trim().length > 20) {
      toast.error(t('validation.usernameTooLong') || 'Name must be 20 characters or less');
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({ display_name: editDisplayName.trim() });
      await refreshProfile();
      setIsEditingName(false);
      toast.success(t('profile.saved') || 'Profile saved!');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('profile.saveError') || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar save (now using image avatars)
  const handleSaveEmojiAvatar = async ({ avatarImage, emoji, color }: { avatarImage: string; emoji?: string; color?: string }): Promise<void> => {
    try {
      await updateProfile({
        avatar_image: avatarImage,
        // Keep emoji/color for backward compatibility
        avatar_emoji: emoji || '🎮',
        avatar_color: color || '#4ECDC4'
      });
      await refreshProfile();
      toast.success(t('profile.saved') || 'Avatar updated!');
    } catch (err) {
      console.error('Save avatar error:', err);
      toast.error(t('profile.saveError') || 'Failed to save');
    }
  };

  // Start editing display name
  const startEditingName = (): void => {
    setEditDisplayName(profile?.display_name || profile?.username || '');
    setIsEditingName(true);
  };

  // Not authenticated - show sign in prompt
  if (!loading && !isAuthenticated) {
    return (
      <div className={cn(
        isLandscape ? 'h-screen overflow-y-auto' : 'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <User className="mx-auto text-6xl text-gray-600 mb-4" />
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('profile.title')}
            </h2>
            <p className={cn(
              'text-lg mb-6',
              isDarkMode ? 'text-gray-600' : 'text-gray-600'
            )}>
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
                  isDarkMode
                    ? 'border-slate-600 text-gray-300 hover:bg-slate-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                )}
              >
                <ArrowLeft className="me-2 rtl:rotate-180" />
                Back to Game
              </Button>
            </div>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          showGuestStats={true}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        isLandscape ? 'h-screen overflow-y-auto' : 'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated profile view
  return (
    <div className={cn(
      isLandscape ? 'h-screen overflow-y-auto' : 'min-h-screen',
      isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <AutoHideHeader />

      <div className={cn(
        "max-w-4xl mx-auto px-4",
        isLandscape ? "py-2" : "py-8"
      )}>
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl p-6 mb-6',
            isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
          )}
        >
          <div className="flex items-center gap-6">
            {/* Avatar with upload/edit controls */}
            <div className="relative">
              <Avatar
                profilePictureUrl={profile?.profile_picture_url ?? undefined}
                avatarEmoji={profile?.avatar_emoji ?? undefined}
                avatarColor={profile?.avatar_color ?? undefined}
                size="xl"
                className="shadow-lg"
              />

              {/* Upload Button (camera icon) */}
              <label
                className={cn(
                  'absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-colors',
                  isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-white text-gray-600 hover:bg-gray-100'
                )}
                title={t('profile.uploadPhoto') || 'Upload Photo'}
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              {/* Remove profile picture button */}
              {profile?.profile_picture_url && (
                <button
                  onClick={handleRemoveProfilePicture}
                  className={cn(
                    'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors',
                    isDarkMode ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-red-500 text-white hover:bg-red-400'
                  )}
                  title={t('profile.removePhoto') || 'Remove Photo'}
                >
                  <X size={10} />
                </button>
              )}

              {/* Edit emoji button (only show if no profile picture) */}
              {!profile?.profile_picture_url && (
                <button
                  onClick={() => setShowEmojiPicker(true)}
                  className={cn(
                    'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors',
                    isDarkMode ? 'bg-slate-600 text-gray-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  )}
                  title={t('profile.chooseEmoji') || 'Change Emoji'}
                >
                  <Edit size={10} />
                </button>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className={cn(
                      'h-10 text-lg font-bold',
                      isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-300'
                    )}
                    maxLength={20}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveDisplayName}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingName(false)}
                    className={isDarkMode ? 'border-slate-600' : ''}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <h1 className={cn(
                  'text-2xl font-bold flex items-center gap-2',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  {profile?.display_name || profile?.username || 'Player'}
                  <button
                    onClick={startEditingName}
                    className={cn(
                      'p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors',
                      isDarkMode ? 'text-gray-600' : 'text-gray-600'
                    )}
                    title={t('profile.editName') || 'Edit Name'}
                  >
                    <Edit size={14} />
                  </button>
                </h1>
              )}
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-gray-600' : 'text-gray-600'
              )}>
                {t('profile.memberSince')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* XP Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'rounded-2xl p-4 sm:p-6 mb-6',
            isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn(
              'text-lg font-bold flex items-center gap-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              <span className="text-xl">⚡</span>
              {t('xp.title') || 'Player Level'}
            </h2>
            <LevelBadge
              level={profile?.current_level || 1}
              size="lg"
              showLabel
            />
          </div>

          <XpProgressBar
            totalXp={profile?.total_xp || 0}
            showNumbers
          />

          {(profile?.current_level ?? 0) >= 5 && (
            <div className={cn(
              'mt-4 pt-4 border-t',
              isDarkMode ? 'border-slate-700' : 'border-gray-200'
            )}>
              <p className={cn(
                'text-sm font-medium',
                isDarkMode ? 'text-gray-600' : 'text-gray-600'
              )}>
                {t('xp.totalXpEarned') || 'Total XP Earned'}: <span className={cn(
                  'font-bold',
                  isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                )}>{(profile?.total_xp || 0).toLocaleString()}</span>
              </p>
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
        >
          <StatCard
            icon={<Gamepad2 />}
            label={t('profile.totalGames')}
            value={profile?.total_games || 0}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<Trophy />}
            label={t('profile.wins')}
            value={profile?.ranked_wins || 0}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<Star />}
            label={t('profile.totalScore')}
            value={(profile?.total_score || 0).toLocaleString()}
            isDarkMode={isDarkMode}
            highlight
          />
          <StatCard
            icon={<span className="text-lg">📝</span>}
            label={t('profile.wordsFound')}
            value={profile?.total_words || 0}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<Clock />}
            label={t('profile.timePlayed')}
            value={formatTimePlayed(profile?.total_time_played)}
            isDarkMode={isDarkMode}
          />
        </motion.div>

        {/* Ranked Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'rounded-2xl p-6 mb-6',
            isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
          )}
        >
          <h2 className={cn(
            'text-lg font-bold mb-4 flex items-center gap-2',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            <Trophy className="text-yellow-500" />
            {t('ranked.title')}
          </h2>

          {canPlayRanked ? (
            <div className={cn(
              'flex items-center gap-4 p-4 rounded-xl',
              isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
            )}>
              <span className="text-3xl">🏆</span>
              <div>
                <p className={cn(
                  'font-semibold',
                  isDarkMode ? 'text-green-400' : 'text-green-700'
                )}>
                  {t('ranked.unlocked')}
                </p>
                <p className={cn(
                  'text-sm',
                  isDarkMode ? 'text-gray-600' : 'text-gray-600'
                )}>
                  MMR: {profile?.ranked_mmr || 1000}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between mb-2">
                <span className={cn(
                  'text-sm',
                  isDarkMode ? 'text-gray-600' : 'text-gray-600'
                )}>
                  {t('ranked.unlockProgress', { current: profile?.casual_games || 0, required: 10 })}
                </span>
                <span className={cn(
                  'text-sm font-medium',
                  isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                )}>
                  {gamesUntilRanked} to go
                </span>
              </div>
              <div className={cn(
                'h-3 rounded-full overflow-hidden',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )}>
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((profile?.casual_games || 0) / 10) * 100)}%` }}
                />
              </div>
              <p className={cn(
                'mt-2 text-sm',
                isDarkMode ? 'text-gray-600' : 'text-gray-600'
              )}>
                {t('ranked.playMoreToUnlock', { count: gamesUntilRanked })}
              </p>
            </div>
          )}
        </motion.div>

        {/* Achievement Counts with Tier Display - showing ALL achievements (earned + locked) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            'rounded-2xl p-6',
            isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
          )}
        >
          <h2 className={cn(
            'text-lg font-bold mb-4',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            {t('profile.achievements')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {(() => {
              const earnedCounts = profile?.achievement_counts || {};
              const allAchievementKeys = Object.keys(ACHIEVEMENT_ICONS);

              // Separate earned and locked achievements
              const earnedAchievements = Object.entries(earnedCounts)
                .sort((a, b) => b[1] - a[1]); // Sort by count descending

              const lockedAchievements = allAchievementKeys
                .filter(key => !earnedCounts[key])
                .sort(); // Sort alphabetically

              // Combine: earned first, then locked
              const allAchievements = [
                ...earnedAchievements.map(([key, count]) => ({ key, count, locked: false })),
                ...lockedAchievements.map(key => ({ key, count: 0, locked: true }))
              ];

              return allAchievements.map(({ key, count, locked }, index) => {
                // Get achievement info from translations
                const achievementData: Achievement = {
                  icon: getAchievementIcon(key),
                  name: t(`achievements.${key}.name`) || key,
                  description: t(`achievements.${key}.description`) || '',
                };
                return (
                  <AchievementBadge
                    key={key}
                    achievement={achievementData}
                    index={index}
                    count={count}
                    showTier={true}
                    locked={locked}
                  />
                );
              });
            })()}
          </div>
        </motion.div>

        {/* Back Buttons - Neo-Brutalist styled */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {/* Back to Active Game - Only shown when in a game room */}
          {activeGameSession && (
            <Button
              onClick={() => router.push(`/${language}`)}
              className={cn(
                'px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
                'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                'bg-neo-lime text-neo-black hover:bg-neo-lime/90'
              )}
            >
              <Play className="me-2" />
              {t('profile.backToRoom') || 'Back to Room'} {activeGameSession.gameCode}
            </Button>
          )}

          {/* Back to Lobby - Always shown, secondary when in game */}
          <Button
            onClick={() => router.push(`/${language}`)}
            variant={activeGameSession ? 'outline' : 'default'}
            className={cn(
              'px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
              'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
              'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
              activeGameSession
                ? isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
                : isDarkMode
                  ? 'bg-neo-cyan text-neo-black hover:bg-neo-cyan/90'
                  : 'bg-neo-purple text-neo-white hover:bg-neo-purple/90'
            )}
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {activeGameSession
              ? (t('profile.backToLobby') || 'Back to Lobby')
              : (t('profile.backToGame') || 'Back to Game')}
          </Button>
        </motion.div>
      </div>

      {/* Avatar Picker Modal */}
      <EmojiAvatarPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSave={handleSaveEmojiAvatar}
        currentAvatarImage={profile?.avatar_image}
        currentEmoji={profile?.avatar_emoji}
        currentColor={profile?.avatar_color}
      />
    </div>
  );
}

function StatCard({ icon, label, value, isDarkMode, highlight = false }: StatCardProps): React.ReactNode {
  return (
    <div className={cn(
      'rounded-xl p-4 text-center',
      highlight
        ? isDarkMode
          ? 'bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30'
          : 'bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200'
        : isDarkMode
          ? 'bg-slate-800/50 border border-slate-700'
          : 'bg-white border border-gray-200 shadow-md'
    )}>
      <div className={cn(
        'text-2xl mb-2',
        highlight
          ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
          : isDarkMode ? 'text-gray-600' : 'text-gray-600'
      )}>
        {icon}
      </div>
      <p className={cn(
        'text-2xl font-bold',
        highlight
          ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
          : isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
      <p className={cn(
        'text-xs',
        isDarkMode ? 'text-gray-600' : 'text-gray-600'
      )}>
        {label}
      </p>
    </div>
  );
}
