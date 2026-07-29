'use client';

import React from 'react';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import ConnectionsReviewPanel from '@/components/admin/connections-review/ConnectionsReviewPanel';

export default function PageClient(): React.JSX.Element {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const isProfileLoading = !authLoading && !!user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-neo-navy p-8 text-center text-neo-white">
        <ShieldX className="h-10 w-10 text-neo-red" aria-hidden="true" />
        <p className="text-lg font-bold">Admins only</p>
        <p className="text-sm text-neo-white/60">You don&apos;t have access to the puzzle-review tool.</p>
      </div>
    );
  }

  if (authLoading || isProfileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen texture-halftone', isRTL && 'rtl')}>
      <Header />
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <AdminPageHeader title={t('admin.sidebar.puzzleReview')} />
          <ConnectionsReviewPanel />
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
