'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, UserX } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { GuestManager } from '@/components/admin/GuestManager';
import { useTheme } from '@/utils/ThemeContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';

export default function GuestsPageClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const [authToken, setAuthToken] = useState<string | null>(null);

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

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">
            Admin Access Required
          </h1>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 me-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

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
      isRTL && 'rtl',
    )}>
      <Header />
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <div className="flex items-center gap-4 mb-6">
            <UserX className="w-8 h-8 text-slate-400" />
            <div>
              <h1 className={cn('text-2xl font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                Guest Players
              </h1>
              <p className="text-sm text-slate-500">
                Anonymous sessions, their game history, and conversion to registered users
              </p>
            </div>
          </div>

          <GuestManager authToken={authToken} />
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
