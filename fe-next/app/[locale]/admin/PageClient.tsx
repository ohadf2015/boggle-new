'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LiveMonitor } from '@/components/admin/LiveMonitor';
import { TodayGamesHistory } from '@/components/admin/TodayGamesHistory';
import { IndexNowPanel } from '@/components/admin/IndexNowPanel';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { PulseSection } from '@/components/admin/overview/PulseSection';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { useOverviewPulse } from '@/hooks/useOverviewPulse';
import { TeacherHealthCard } from '@/components/admin/overview/TeacherHealthCard';
import { SystemHealth } from '@/components/admin/overview/SystemHealth';
import { ModeMixPanel } from '@/components/admin/overview/ModeMixPanel';
const DailyActivityChart = dynamic(
  () => import('@/components/admin/overview/DailyActivityChart').then((m) => m.DailyActivityChart),
  { ssr: false }
);
import { RevenuePanel } from '@/components/admin/overview/RevenuePanel';
import { SignupGrowthChart } from '@/components/admin/overview/SignupGrowthChart';
import { DeploymentInfoPanel } from '@/components/admin/overview/DeploymentInfoPanel';

/** A centered full-screen message (access denied, session error); the page's only dead-end states. */
function Gate({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
      <div className="text-center">
        {icon}
        <h1 className="text-2xl font-neo-display text-neo-white mb-2">{title}</h1>
        <p className="text-slate-400 mb-6 max-w-md">{body}</p>
        {action}
      </div>
    </div>
  );
}

export default function AdminPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const { authToken, refreshToken, isLoading: tokenLoading, error: tokenError } = useAdminAuth();
  const { stats, health } = useAdminDashboard(authToken);
  const { pulse, windowDays, setWindowDays, failed, retry, revenue } = useOverviewPulse(authToken, stats, health);

  const isProfileLoading = !authLoading && user && !profile;

  // Access denied
  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <Gate
        icon={<Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />}
        title={t('admin.accessRequired')}
        body={t('admin.accessDenied')}
        action={
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 me-2" />
            {t('common.backToHome')}
          </Button>
        }
      />
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
      <Gate
        icon={<Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />}
        title={t('admin.sessionError')}
        body={tokenError}
        action={
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 me-2" />
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />

      <div className="flex flex-1">
        {/* Sidebar — hidden on mobile (bottom tabs used instead) */}
        <AdminSidebar />

        {/* Main content area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          {/* Page Header */}
          <AdminPageHeader
            title={t('admin.dashboard')}
            subtitle={authToken ? t('admin.live.subtitle') : t('common.loading')}
            actions={
              <span className="text-sm text-slate-400">
                {profile?.display_name || profile?.username}
              </span>
            }
          />

          {/* Insight first: trend tiles, then what is working / not / about to break */}
          <PulseSection
            pulse={pulse}
            windowDays={windowDays}
            onWindowChange={setWindowDays}
            failed={failed}
            onRetry={retry}
            stats={stats}
            revenue={revenue}
          />

          {/* Teacher health summary — actionable, glanceable, links to full funnel */}
          <TeacherHealthCard />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <SystemHealth health={health} />
              <button
                onClick={() => router.push(`/${language}/admin/system`)}
                className="self-start text-xs font-medium text-neo-lime/80 hover:text-neo-lime transition-colors"
              >
                {t('admin.sidebar.system')} →
              </button>
            </div>
          </div>

          <ModeMixPanel />

          {/* Dashboard content */}
          {authToken ? (
            <>
              <div id="overview-signups"><SignupGrowthChart authToken={authToken} /></div>
              <div id="overview-revenue"><RevenuePanel authToken={authToken} /></div>
              <div id="overview-daily"><DailyActivityChart authToken={authToken} /></div>
              <LiveMonitor authToken={authToken} onTokenExpired={refreshToken} />
              <TodayGamesHistory authToken={authToken} />
              <DeploymentInfoPanel authToken={authToken} />

              <div id="indexnow" className="mt-8">
                <IndexNowPanel />
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
      <AdminNotificationBell />
    </div>
  );
}
