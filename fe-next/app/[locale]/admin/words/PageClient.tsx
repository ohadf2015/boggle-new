'use client';

import { DailyWordManager } from '@/components/admin/DailyWordManager';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';

export default function AdminWordsPageClient() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">{t('admin.accessRequired')}</h1>
          <p className="text-slate-400 mb-6">{t('admin.accessDenied')}</p>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('common.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading || isProfileLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const isRTL = language === 'he';

  return (
    <div className={cn(
      'flex-1 flex flex-col w-full overflow-x-hidden min-h-screen',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50',
      isRTL && 'rtl'
    )}>
      <Header />
      <AdminSubNav />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className={cn(
                'text-lg sm:text-2xl md:text-3xl font-bold truncate',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}>
                Word Manager
              </h1>
              <p className={cn(
                'text-xs sm:text-sm truncate',
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              )}>
                Daily challenge words
              </p>
            </div>
          </div>

          <DailyWordManager />
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
