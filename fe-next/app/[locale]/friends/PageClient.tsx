'use client';

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
export default function FriendsPageClient(): React.JSX.Element {
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
      toast.success(t('common.refreshed'), {
        duration: 2000,
      });
    },
    threshold: 60,
    enabled: isAuthenticated,
  });

  return (
    <div
      className={cn(
        'flex-1 flex flex-col relative',
        isDark
          ? 'bg-linear-to-b from-neo-navy via-neo-navy-light to-neo-navy'
          : 'bg-neo-navy'
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
      <header
        className={cn(
          'sticky top-0 z-40 px-4 py-3 border-b-3 border-neo-black',
          isDark ? 'bg-slate-800/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'
        )}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
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
            {t('friends.title')}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 page-content-safe flex-1">
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
                {t('friends.signInTitle')}
              </p>
              <p className={cn(
                'text-sm',
                isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                {t('friends.signInDescription')}
              </p>
            </div>
          ) : (
            <FriendsList />
          )}
        </motion.div>
      </div>
    </div>
  );
}
