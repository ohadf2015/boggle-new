'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TeacherPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  // Check if user is teacher or admin
  const isTeacher = profile?.is_admin === true;
  const isProfileLoading = !authLoading && user && !profile;

  // Redirect if not authenticated or not teacher
  useEffect(() => {
    if (!authLoading && !isProfileLoading && (!user || !isTeacher)) {
      router.push(`/${language}`);
    }
  }, [authLoading, isProfileLoading, user, isTeacher, router, language]);

  // Loading state
  if (authLoading || isProfileLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <PageLoader
          size="lg"
          text={t('common.loading') || 'Loading...'}
        />
      </div>
    );
  }

  // Not authenticated or not teacher
  if (!user || !isTeacher) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white border-3 border-black rounded-neo shadow-hard max-w-sm w-full mx-4">
          <div className="w-16 h-16 rounded-neo bg-neo-yellow border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-hard-sm">
            <Shield className="w-9 h-9 text-black" />
          </div>
          <h1 className="text-2xl font-neo-display font-black text-black mb-2">
            {t('teacher.accessRequired') || 'Teacher Access Required'}
          </h1>
          <p className="text-black/60 font-bold mb-6">
            {t('teacher.accessDenied') || 'You need teacher privileges to access this page.'}
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome') || 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  return <TeacherDashboard />;
}
