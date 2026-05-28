'use client';

import { Shield, Activity, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';
import { SystemHealth } from '@/components/admin/overview/SystemHealth';
import { GamesDiagnostic } from '@/components/admin/GamesDiagnostic';
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

/** System page — health monitoring, diagnostics, web vitals link, email testing */
export default function SystemPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { authToken, isLoading: tokenLoading } = useAdminAuth();
  const { health } = useAdminDashboard(authToken);

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
        <Button onClick={() => router.push(`/${language}`)} variant="outline">{t('common.backToHome')}</Button>
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
          <h1 className="text-2xl font-neo-display text-neo-white mb-6">{t('admin.sidebar.system')}</h1>

          <SystemHealth health={health} />

          {/* Web Vitals link */}
          <button
            onClick={() => router.push(`/${language}/admin/web-vitals`)}
            className="w-full bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 flex items-center gap-3 hover:bg-neo-navy-elevated/50 transition-colors text-start mb-6"
          >
            <Activity className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-neo-white">{t('admin.nav.webVitals')}</span>
          </button>

          {authToken && (
            <>
              <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
                <GamesDiagnostic authToken={authToken} />
              </div>

              <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-neo-pink" />
                  <h3 className="text-sm font-neo-display text-neo-white">{t('admin.nav.email')}</h3>
                </div>
                <EmailTestPanel
                  authToken={authToken}
                  userEmail={user?.email}
                  userName={profile?.display_name || profile?.username}
                />
              </div>
            </>
          )}
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
