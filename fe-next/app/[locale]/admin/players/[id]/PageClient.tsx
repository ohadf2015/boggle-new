'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';
import { PageLoader } from '@/components/ui/PageLoader';
import { Loader } from '@/components/ui/Loader';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { PlayerDetailView, type PlayerDetail } from '@/components/admin/players/PlayerDetailView';

interface Props {
  playerId: string;
}

export default function PlayerDetailPageClient({ playerId }: Props) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { authToken, isLoading: tokenLoading } = useAdminAuth();

  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken || !playerId) return;

    let cancelled = false;
    setDetail(null);
    setError(null);

    fetch(`/api/admin/players/${encodeURIComponent(playerId)}/detail`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (res.status === 404) throw new Error('NOT_FOUND');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { data?: PlayerDetail } & PlayerDetail) => {
        if (cancelled) return;
        setDetail(json.data ?? json);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });

    return () => { cancelled = true; };
  }, [authToken, playerId]);

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">{t('admin.accessRequired')}</h1>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 me-2" />
            {t('common.backToHome')}
          </Button>
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
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${language}/admin/players`)}
              className="gap-2"
            >
              <DirectionalIcon icon={ArrowLeft} className="w-4 h-4" />
              {t('admin.player.back')}
            </Button>
            <h1 className="text-2xl font-neo-display text-neo-white">
              {t('admin.player.title')}
            </h1>
          </div>

          {error === 'NOT_FOUND' ? (
            <div className="text-center py-12 text-slate-400">
              {t('admin.player.notFound')}
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border-neo border-red-500 rounded-neo p-4 text-red-300 text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {t('admin.player.loadError')}: {error}
            </div>
          ) : detail === null ? (
            <div className="flex justify-center py-12">
              <Loader size="md" />
            </div>
          ) : (
            <PlayerDetailView detail={detail} />
          )}
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
