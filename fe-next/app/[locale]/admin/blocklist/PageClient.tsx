'use client';

import { Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { BlockListManager } from '@/components/admin/blocklist/BlockListManager';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function BlocklistPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { authToken, isLoading: tokenLoading } = useAdminAuth();

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

  if (authLoading || isProfileLoading || tokenLoading || !authToken) {
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
          <div className="mb-6">
            <h1 className="text-2xl font-neo-display text-neo-white">{t('admin.blocklist.title')}</h1>
            <p className="text-sm text-slate-400 mt-1">{t('admin.blocklist.subtitle')}</p>
          </div>
          <BlockListManager authToken={authToken} />
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
