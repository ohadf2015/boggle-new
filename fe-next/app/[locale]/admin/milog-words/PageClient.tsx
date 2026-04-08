'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, BookCheck } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MilogWordsManager } from '@/components/admin/MilogWordsManager';
import { useTheme } from '@/utils/ThemeContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';

export default function MilogWordsPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get auth token
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      getAuthToken().then(setAuthToken);
    }
  }, [authLoading, isAdmin, getAuthToken]);

  const isProfileLoading = !authLoading && user && !profile;

  // Not authenticated or not admin
  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">
            Admin Access Required
          </h1>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 me-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (authLoading || isProfileLoading || !authToken) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text="Loading..." />
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
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <BookCheck className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h1 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                  {t('admin.milogWords.title')}
                </h1>
                <p className="text-sm text-slate-500">
                  {t('admin.milogWords.subtitle')}
                </p>
              </div>
            </div>
          </div>

          <MilogWordsManager authToken={authToken} />
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
