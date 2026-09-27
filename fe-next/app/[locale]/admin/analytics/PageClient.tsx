'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { RetentionHeatmap } from '@/components/admin/analytics/RetentionHeatmap';
import { EngagementFunnel } from '@/components/admin/analytics/EngagementFunnel';
import { ChurnRiskPanel } from '@/components/admin/analytics/ChurnRiskPanel';
import { CountryBreakdown } from '@/components/admin/analytics/CountryBreakdown';
import { AcquisitionSources } from '@/components/admin/analytics/AcquisitionSources';
import { GuestActivityPanel } from '@/components/admin/analytics/GuestActivityPanel';
import { AuthSessionsPanel } from '@/components/admin/analytics/AuthSessionsPanel';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface CohortRow {
  cohort_week: string;
  week_offset: number;
  retained: number;
  cohort_size: number;
  retention_pct: number;
}

interface FunnelData {
  registered: number;
  playedFirstGame: number;
  returnedDay7: number;
  returnedDay30: number;
}

interface ChurnPlayer {
  id: string;
  username: string;
  display_name?: string;
  last_game_at: string;
  total_games: number;
}

export default function AnalyticsPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { authToken, isLoading: tokenLoading } = useAdminAuth();

  const [cohorts, setCohorts] = useState<CohortRow[] | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [churnPlayers, setChurnPlayers] = useState<ChurnPlayer[] | null>(null);
  const [churnTotal, setChurnTotal] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    if (!authToken) return;
    const headers = { Authorization: `Bearer ${authToken}` };

    const [cohortsRes, funnelRes, churnRes] = await Promise.allSettled([
      fetch('/api/admin/analytics/cohorts?weeks=12', { headers }).then(r => r.json()),
      fetch('/api/admin/analytics/funnel', { headers }).then(r => r.json()),
      fetch('/api/admin/analytics/churn-risk?days=14&limit=10', { headers }).then(r => r.json()),
    ]);

    if (cohortsRes.status === 'fulfilled') {
      const data = cohortsRes.value.data ?? cohortsRes.value;
      setCohorts(data.cohorts ?? []);
    }
    if (funnelRes.status === 'fulfilled') {
      const data = funnelRes.value.data ?? funnelRes.value;
      setFunnel(data.funnel ?? null);
    }
    if (churnRes.status === 'fulfilled') {
      const data = churnRes.value.data ?? churnRes.value;
      setChurnPlayers(data.players ?? []);
      setChurnTotal(data.pagination?.total ?? 0);
    }
  }, [authToken]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">{t('admin.accessRequired')}</h1>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">{t('common.backToHome')}</Button>
        </div>
      </div>
    );
  }

  if (authLoading || isProfileLoading || tokenLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-neo-display text-neo-white">{t('admin.analytics.title')}</h1>
            <Button variant="ghost" size="sm" onClick={fetchAnalytics} className="text-slate-400">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <EngagementFunnel funnel={funnel} />
          <RetentionHeatmap cohorts={cohorts} />
          {authToken && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CountryBreakdown authToken={authToken} />
                <AcquisitionSources authToken={authToken} />
              </div>
              <AuthSessionsPanel authToken={authToken} />
              <GuestActivityPanel authToken={authToken} />
            </>
          )}
          <ChurnRiskPanel players={churnPlayers} total={churnTotal} />
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
