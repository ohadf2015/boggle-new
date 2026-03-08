'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { InvalidWordsManager } from '@/components/admin/InvalidWordsManager';
import { useTheme } from '@/utils/ThemeContext';
import { PageLoader } from '@/components/ui/PageLoader';

export default function InvalidWordsPageClient() {
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

  return (
    <div className={cn(
      'flex-1 flex flex-col w-full overflow-x-hidden',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.push(`/${language}/admin`)}
            variant="outline"
            size="sm"
            className={cn(
              "rounded-lg flex-shrink-0",
              isDarkMode && "border-slate-600 text-gray-300 hover:bg-slate-700"
            )}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            <span className="hidden sm:inline ms-2">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                {t('admin.invalidWords.title')}
              </h1>
              <p className="text-sm text-slate-500">
                {t('admin.invalidWords.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <InvalidWordsManager authToken={authToken} />
      </div>
    </div>
  );
}
