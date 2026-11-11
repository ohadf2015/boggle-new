'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { prefetchDrillSections } from '@/lib/admin/adminJsonCache';
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
import { DrillSection } from '@/components/admin/shared/DrillSection';
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

  const pulseReady = pulse != null;
  useEffect(() => {
    if (!authToken || !pulseReady) return;
    const id = setTimeout(() => {
      prefetchDrillSections(authToken);
      void import('@/components/admin/overview/DailyActivityChart');
    }, 400);
    return () => clearTimeout(id);
  }, [authToken, pulseReady]);

  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const isOpen = (id: string) => openIds.has(id);
  const setSection = (id: string) => (open: boolean) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  const openSection = useCallback((id: string) => {
    setOpenIds((prev) => new Set(prev).add(id));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
  }, []);

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

          {/* Insight first: today against yesterday, then what is working / not / about to break */}
          <PulseSection
            pulse={pulse}
            windowDays={windowDays}
            onWindowChange={setWindowDays}
            failed={failed}
            onRetry={retry}
            onOpenSection={openSection}
            stats={stats}
            revenue={revenue}
          />

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TeacherHealthCard />
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

          {/* Everything heavy sits behind a drill-down and loads only when opened */}
          {authToken ? (
            <>
              <DrillSection id="overview-live" title={t('admin.overview.section.live', 'Live right now')} summary={t('admin.overview.section.liveHint', 'Who is online and which games are running')} open={isOpen('overview-live')} onOpenChange={setSection('overview-live')}>
                <LiveMonitor authToken={authToken} onTokenExpired={refreshToken} />
              </DrillSection>
              <DrillSection id="overview-today" title={t('admin.overview.section.today', 'Games today')} summary={stats ? t('admin.overview.section.todayHint', '{games} games so far today', { games: stats.activity.gamesToday }) : undefined} open={isOpen('overview-today')} onOpenChange={setSection('overview-today')}>
                <TodayGamesHistory authToken={authToken} />
              </DrillSection>
              <DrillSection id="overview-daily" title={t('admin.overview.section.daily', 'Daily activity')} summary={t('admin.overview.section.dailyHint', 'Games and players, day by day')} open={isOpen('overview-daily')} onOpenChange={setSection('overview-daily')}>
                <DailyActivityChart authToken={authToken} />
              </DrillSection>
              <DrillSection id="overview-modes" title={t('admin.overview.section.modes', 'Game modes')} summary={t('admin.overview.section.modesHint', 'What people choose to play')} open={isOpen('overview-modes')} onOpenChange={setSection('overview-modes')}>
                <ModeMixPanel />
              </DrillSection>
              <DrillSection id="overview-signups" title={t('admin.overview.section.signups', 'Signups')} summary={stats ? t('admin.overview.section.signupsHint', '{today} today, {week} this week', { today: stats.activity.signupsToday, week: stats.activity.signupsWeek }) : undefined} open={isOpen('overview-signups')} onOpenChange={setSection('overview-signups')}>
                <SignupGrowthChart authToken={authToken} />
              </DrillSection>
              <DrillSection id="overview-revenue" title={t('admin.overview.section.revenue', 'Revenue')} summary={revenue ? t('admin.overview.section.revenueHint', '{paying} paying, {trialing} in a trial', { paying: revenue.paying, trialing: revenue.trialing }) : undefined} open={isOpen('overview-revenue')} onOpenChange={setSection('overview-revenue')}>
                <RevenuePanel authToken={authToken} />
              </DrillSection>
              <DrillSection id="overview-tech" title={t('admin.overview.section.tech', 'Deploy and indexing')} summary={t('admin.overview.section.techHint', 'Current build and search-engine pings')} open={isOpen('overview-tech')} onOpenChange={setSection('overview-tech')}>
                <DeploymentInfoPanel authToken={authToken} />
                <div id="indexnow" className="mt-6">
                  <IndexNowPanel />
                </div>
              </DrillSection>
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
