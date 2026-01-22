'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Shield, Users, BookOpen, Calendar, Activity, Sparkles, Mail, Globe, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { LiveMonitor } from '@/components/admin/LiveMonitor';
import { TodayGamesHistory } from '@/components/admin/TodayGamesHistory';
import { GamesDiagnostic } from '@/components/admin/GamesDiagnostic';
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';
import { PullToRefreshWrapper } from '@/components/ui/PullToRefreshWrapper';
import { isMobileDevice } from '@/utils/mobileAccessibility';
import { NeoLoader } from '@/components/ui/NeoLoader';

export default function AdminPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Get auth token for API calls
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  // Fetch auth token when admin status is confirmed
  useEffect(() => {
    if (!authLoading && isAdmin) {
      getAuthToken().then(setAuthToken);
    }
  }, [authLoading, isAdmin, getAuthToken]);

  // Still loading profile - wait before showing access denied
  const isProfileLoading = !authLoading && user && !profile;

  // Not authenticated or not admin (but only check after profile has loaded)
  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">
            {t('admin.accessRequired') || 'Admin Access Required'}
          </h1>
          <p className="text-slate-400 mb-6">
            {t('admin.accessDenied') || 'You need administrator privileges to access this page.'}
          </p>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome') || 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (authLoading || isProfileLoading || !authToken) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading') || 'Loading...'} />
      </div>
    );
  }

  const content = (
    <div className={cn('flex-1 flex flex-col bg-neo-navy', isRTL && 'rtl')}>
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push(`/${language}`)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-neo-white"
            >
              <ArrowLeft className={cn('w-4 h-4', isRTL ? 'ml-2 rotate-180' : 'mr-2')} />
              {t('common.back') || 'Back'}
            </Button>
            <div>
              <h1 className="text-2xl font-neo-display text-neo-white">
                {t('admin.dashboard') || 'Admin Dashboard'}
              </h1>
              <p className="text-sm text-slate-400">
                {t('admin.live.subtitle') || 'Real-time game monitoring'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              <span className="hidden xs:inline">{t('admin.welcome') || 'Welcome,'} </span>
              {profile?.display_name || profile?.username}
            </span>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/players`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.players')}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/dictionary`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.dictionary')}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/invalid-words`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.invalidWords') || 'Invalid Words'}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/words`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.dailyChallenge')}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/wikipedia-words`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-teal-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.wikipediaWords')}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/daily-buzz`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-pink-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.dailyBuzz')}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/web-vitals`)}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.webVitals')}</span>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors border-2 border-neo-pink/30"
            onClick={() => {
              const emailSection = document.getElementById('email-testing');
              emailSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
              <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-neo-pink" />
              <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">{t('admin.nav.email')}</span>
            </CardContent>
          </Card>
        </div>

        {/* Live Monitor Component */}
        <LiveMonitor authToken={authToken} />

        {/* Today's Games History */}
        <TodayGamesHistory authToken={authToken} />

        {/* Database Diagnostic Tools */}
        <div className="mt-8 bg-slate-800/50 rounded-neo border-neo border-black p-4">
          <GamesDiagnostic authToken={authToken} />
        </div>

        {/* Email Testing Section */}
        <div id="email-testing" className="mt-8">
          <EmailTestPanel
            authToken={authToken}
            userEmail={user?.email}
            userName={profile?.display_name || profile?.username}
          />
        </div>
      </div>
    </div>
  );

  // Wrap with pull-to-refresh on mobile
  if (isMobile) {
    return (
      <PullToRefreshWrapper onRefresh={async () => {
        // The LiveMonitor handles its own refresh
        await new Promise(resolve => setTimeout(resolve, 500));
      }}>
        {content}
      </PullToRefreshWrapper>
    );
  }

  return content;
}
