'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LiveMonitor } from '@/components/admin/LiveMonitor';
import { TodayGamesHistory } from '@/components/admin/TodayGamesHistory';
import { GamesDiagnostic } from '@/components/admin/GamesDiagnostic';
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';
import { IndexNowPanel } from '@/components/admin/IndexNowPanel';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { PullToRefreshWrapper } from '@/components/ui/PullToRefreshWrapper';
import { isMobileDevice } from '@/utils/mobileAccessibility';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { KPICards } from '@/components/admin/overview/KPICards';
import { SystemHealth } from '@/components/admin/overview/SystemHealth';
import { GameModePopularity } from '@/components/admin/overview/GameModePopularity';
import { DailyActivityChart } from '@/components/admin/overview/DailyActivityChart';

export default function AdminPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const { authToken, refreshToken, isLoading: tokenLoading, error: tokenError } = useAdminAuth();
  const { stats, health } = useAdminDashboard(authToken);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const isProfileLoading = !authLoading && user && !profile;

  // Access denied
  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">
            {t('admin.accessRequired')}
          </h1>
          <p className="text-slate-400 mb-6">{t('admin.accessDenied')}</p>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('common.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (authLoading || isProfileLoading || tokenLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <PageLoader size="lg" text={t('common.loading')} />
          {tokenLoading && !authLoading && (
            <p className="text-slate-400 mt-4 text-sm">{t('admin.loadingSession')}</p>
          )}
        </div>
      </div>
    );
  }

  // Token error
  if (tokenError && !authToken) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">{t('admin.sessionError')}</h1>
          <p className="text-slate-400 mb-6 max-w-md">{tokenError}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 me-2" />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const mainContent = (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />

      <div className="flex flex-1">
        {/* Sidebar — hidden on mobile (bottom tabs used instead) */}
        <AdminSidebar />

        {/* Main content area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-neo-display text-neo-white">
                {t('admin.dashboard')}
              </h1>
              <p className="text-sm text-slate-400">
                {authToken ? t('admin.live.subtitle') : t('common.loading')}
              </p>
            </div>
            <span className="text-sm text-slate-400">
              {profile?.display_name || profile?.username}
            </span>
          </div>

          {/* KPI Cards + System Health + Game Mode Popularity */}
          <KPICards stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SystemHealth health={health} />
            <GameModePopularity />
          </div>

          {/* Dashboard content */}
          {authToken ? (
            <>
              <DailyActivityChart authToken={authToken} />
              <LiveMonitor authToken={authToken} onTokenExpired={refreshToken} />
              <TodayGamesHistory authToken={authToken} />

              <div className="mt-8 bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
                <GamesDiagnostic authToken={authToken} />
              </div>

              <div id="indexnow" className="mt-8">
                <IndexNowPanel />
              </div>

              <div id="email-testing" className="mt-8">
                <EmailTestPanel
                  authToken={authToken}
                  userEmail={user?.email}
                  userName={profile?.display_name || profile?.username}
                />
              </div>
            </>
          ) : (
            <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-12 text-center">
              <Loader size="md" text={t('admin.loadingDashboard')} />
              <p className="text-slate-400 mt-4 text-sm">{t('admin.preparingTools')}</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <AdminBottomNav />
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefreshWrapper onRefresh={async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      }}>
        {mainContent}
      </PullToRefreshWrapper>
    );
  }

  return mainContent;
}
