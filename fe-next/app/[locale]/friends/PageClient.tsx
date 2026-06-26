'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, LogIn, Sparkles, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import FriendsList from '@/components/friends/FriendsList';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { useFriends } from '@/hooks/useFriends';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';
import { captureInviteRef, peekInviteRef } from '@/utils/inviteRef';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

/**
 * Friends Page - Manage friends and direct challenges
 */
export default function FriendsPageClient(): React.JSX.Element {
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const { isAuthenticated, profile, loading: authLoading } = useAuth();
  const { isCrazyGames, isLoggedIn: isCrazyGamesLoggedIn, login: loginCrazyGames, isLoggingIn: isCrazyGamesLoggingIn } = useCrazyGamesAuth();
  const { refresh: refreshFriends } = useFriends();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDark = theme === 'dark';

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [inviterUsername, setInviterUsername] = useState<string | null>(null);

  // Capture `?ref=<username>` so it survives sign-up; AuthContext will replay
  // it after authentication completes (auto-sends a friend request).
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) {
      captureInviteRef(ref, profile?.username ?? null);
    }
    setInviterUsername(peekInviteRef());
  }, [searchParams, profile?.username, isAuthenticated]);

  // Listen for AuthContext's invite-replay event so we can show an i18n-aware
  // confirmation toast right after auto-friend fires post-signup.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{
        username: string;
        success: boolean;
        reason?: 'not_found' | 'send_failed';
      }>).detail;
      if (!detail) return;
      if (detail.success) {
        toast.success(
          t('friends.invitedAutoSentToast').replace('{name}', `@${detail.username}`),
          { duration: 4500 }
        );
        void refreshFriends();
      } else if (detail.reason === 'not_found') {
        toast.error(
          t('friends.invitedNotFoundToast').replace('{name}', `@${detail.username}`)
        );
      }
      setInviterUsername(null);
    };
    window.addEventListener('lc:invite-replay', handler);
    return () => window.removeEventListener('lc:invite-replay', handler);
  }, [t, refreshFriends]);

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
          isDark ? 'bg-neo-navy-light/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'
        )}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button type="button"
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
              'hover:shadow-hard hover:-translate-y-0.5 transition-all',
              isDark ? 'bg-neo-navy-elevated text-white' : 'bg-white text-gray-900'
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
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!authLoading && !isAuthenticated && !(isCrazyGames && isCrazyGamesLoggedIn) ? (
            <div className="space-y-4">
              {inviterUsername && !isCrazyGames && (
                <div
                  className={cn(
                    'relative rounded-neo border-3 border-neo-black shadow-hard',
                    'bg-neo-yellow text-neo-black',
                    'px-4 py-4 flex items-start gap-3 overflow-hidden'
                  )}
                  style={{ backgroundImage: 'var(--halftone-pattern)' }}
                  role="status"
                >
                  <Sparkles className="w-6 h-6 shrink-0 -mt-0.5" aria-hidden="true" />
                  <div className="text-start">
                    <p className="font-black uppercase tracking-tight text-base leading-tight">
                      {t('friends.invitedByTitle').replace('{name}', `@${inviterUsername}`)}
                    </p>
                    <p className="text-sm font-bold mt-1 opacity-80">
                      {t('friends.invitedBySubtitle')}
                    </p>
                  </div>
                </div>
              )}
              <div className={cn(
                'text-center py-12 px-4 rounded-neo border-3 border-neo-black',
                isDark ? 'bg-neo-navy-light' : 'bg-white'
              )}>
              {isCrazyGames ? (
                <>
                  <p className={cn('text-lg font-bold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('auth.loginCrazyGames')}
                  </p>
                  <button type="button"
                    onClick={() => { void loginCrazyGames(); }}
                    disabled={isCrazyGamesLoggingIn}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black shadow-hard bg-neo-lime text-neo-black font-bold hover:shadow-hard-pressed hover:translate-y-px transition-all disabled:opacity-60"
                  >
                    {isCrazyGamesLoggingIn ? '…' : t('auth.loginCrazyGames')}
                  </button>
                </>
              ) : (
                <>
                  <p className={cn('text-lg font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('friends.signInTitle')}
                  </p>
                  <p className={cn('text-sm mb-6', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    {t('friends.signInDescription')}
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                    <button type="button"
                      onClick={() => { setAuthModalMode('signup'); setShowAuthModal(true); }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-neo border-2 border-neo-black shadow-hard bg-neo-lime text-neo-black font-bold uppercase tracking-wide hover:shadow-hard-pressed hover:translate-y-px transition-all"
                    >
                      <User size={16} aria-hidden="true" />
                      {t('auth.signUp')}
                    </button>
                    <button type="button"
                      onClick={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-neo border-2 border-neo-black shadow-hard bg-neo-pink text-white font-bold uppercase tracking-wide hover:shadow-hard-pressed hover:translate-y-px transition-all"
                    >
                      <LogIn size={16} aria-hidden="true" />
                      {t('auth.signIn')}
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          ) : (
            <FriendsList />
          )}
        </m.div>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showGuestStats={true}
        initialMode={authModalMode}
      />
    </div>
  );
}
