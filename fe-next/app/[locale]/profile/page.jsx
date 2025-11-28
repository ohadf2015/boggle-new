'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaArrowLeft, FaEdit, FaGamepad, FaTrophy, FaStar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isAuthenticated, isSupabaseEnabled, loading, canPlayRanked, gamesUntilRanked } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Not authenticated - show sign in prompt
  if (!loading && !isAuthenticated) {
    return (
      <div className={cn(
        'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <FaUser className="mx-auto text-6xl text-gray-400 mb-4" />
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('profile.title')}
            </h2>
            <p className={cn(
              'text-lg mb-6',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                <FaArrowLeft className="mr-2" />
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
        'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <Header />
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
      'min-h-screen',
      isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
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
            {/* Avatar */}
            <div className="relative">
              <span
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg"
                style={{ backgroundColor: profile?.avatar_color || '#4ECDC4' }}
              >
                {profile?.avatar_emoji || '🐶'}
              </span>
              <button
                className={cn(
                  'absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md',
                  isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600'
                )}
              >
                <FaEdit size={14} />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className={cn(
                'text-2xl font-bold',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}>
                {profile?.username || 'Player'}
              </h1>
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              )}>
                {t('profile.memberSince')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
        >
          <StatCard
            icon={<FaGamepad />}
            label={t('profile.totalGames')}
            value={profile?.total_games || 0}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<FaTrophy />}
            label={t('profile.wins')}
            value={profile?.ranked_wins || 0}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<FaStar />}
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
            <FaTrophy className="text-yellow-500" />
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
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              )}>
                {t('ranked.playMoreToUnlock', { count: gamesUntilRanked })}
              </p>
            </div>
          )}
        </motion.div>

        {/* Achievement Counts */}
        {profile?.achievement_counts && Object.keys(profile.achievement_counts).length > 0 && (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(profile.achievement_counts).map(([key, count]) => (
                <div
                  key={key}
                  className={cn(
                    'p-3 rounded-lg text-center',
                    isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
                  )}
                >
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    {t(`achievements.${key}.name`) || key}
                  </p>
                  <p className={cn(
                    'text-lg font-bold',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )}>
                    x{count}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
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
            <FaArrowLeft className="mr-2" />
            Back to Game
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, isDarkMode, highlight = false }) {
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
          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
      )}>
        {icon}
      </div>
      <p className={cn(
        'text-2xl font-bold',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
      <p className={cn(
        'text-xs',
        isDarkMode ? 'text-gray-500' : 'text-gray-500'
      )}>
        {label}
      </p>
    </div>
  );
}
