'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Shield, Users, BookOpen, Calendar, Activity, Gamepad2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { LiveMonitor } from '@/components/admin/LiveMonitor';
import { PullToRefreshWrapper } from '@/components/ui/PullToRefreshWrapper';
import { isMobileDevice } from '@/utils/mobileAccessibility';

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
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-yellow mx-auto mb-4" />
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
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-neo-yellow mx-auto mb-4" />
          <p className="text-slate-400">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className={cn('min-h-screen bg-neo-navy', isRTL && 'rtl')}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card 
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/players`)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <Users className="w-8 h-8 text-blue-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Players</span>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/dictionary`)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <BookOpen className="w-8 h-8 text-green-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Dictionary</span>
            </CardContent>
          </Card>

          <Card 
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/words`)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <Calendar className="w-8 h-8 text-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Daily Challenge</span>
            </CardContent>
          </Card>

          <Card 
            className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => router.push(`/${language}/admin/web-vitals`)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <Activity className="w-8 h-8 text-purple-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Web Vitals</span>
            </CardContent>
          </Card>
        </div>

        {/* Live Monitor Component */}
        <LiveMonitor authToken={authToken} />
      </main>
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
