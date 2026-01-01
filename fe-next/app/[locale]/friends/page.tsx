'use client';

import React from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FriendsList from '@/components/friends/FriendsList';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

/**
 * Friends Page - Manage friends and direct challenges
 */
export default function FriendsPage(): React.JSX.Element {
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { refresh: refreshFriends } = useFriends();
  const router = useRouter();
  const isDark = theme === 'dark';

  // Pull-to-refresh for friends list
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      await refreshFriends();
      toast.success(t('common.refreshed') || 'Refreshed', {
        duration: 2000,
        icon: '🔄',
      });
    },
    threshold: 60,
    enabled: isAuthenticated,
  });

  // Handle challenge click - create a challenge and send to friend
  const handleChallengeClick = (friend: { odUserId: string; username: string }) => {
    // For now, redirect to home to start a game
    // In future, this could open a challenge creation flow
    router.push(`/${language}`);
  };

  return (
    <div
      className={cn(
        'min-h-screen relative',
        isDark
          ? 'bg-gradient-to-b from-neo-navy via-neo-navy-light to-neo-navy'
          : 'bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200'
      )}
      {...pullToRefreshHandlers}
    >
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullState.pullDistance}
        isRefreshing={pullState.isRefreshing}
        threshold={60}
      />
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-40 px-4 py-3 border-b-3 border-neo-black',
        isDark ? 'bg-slate-800/95 backdrop-blur' : 'bg-white/95 backdrop-blur'
      )}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
              'hover:shadow-hard hover:-translate-y-0.5 transition-all',
              isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'
            )}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className={cn(
            'text-xl font-black uppercase tracking-wide',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {t('friends.title') || 'Friends'}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!isAuthenticated ? (
            <div className={cn(
              'text-center py-12 px-4 rounded-neo border-3 border-neo-black',
              isDark ? 'bg-slate-800' : 'bg-white'
            )}>
              <p className={cn(
                'text-lg font-bold mb-2',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                {language === 'he' ? 'התחבר כדי להוסיף חברים' : 'Sign in to add friends'}
              </p>
              <p className={cn(
                'text-sm',
                isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                {language === 'he'
                  ? 'צור חשבון כדי לאתגר חברים ולראות מי מנצח!'
                  : 'Create an account to challenge friends and see who wins!'}
              </p>
            </div>
          ) : (
            <FriendsList onChallengeClick={handleChallengeClick} />
          )}
        </motion.div>
      </main>
    </div>
  );
}
