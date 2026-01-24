'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { NeoLoader } from '@/components/ui/NeoLoader';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TeacherPage() {
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
        <NeoLoader
          variant="mascot-letters"
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
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">
            {t('teacher.accessRequired') || 'Teacher Access Required'}
          </h1>
          <p className="text-slate-400 mb-6">
            {t('teacher.accessDenied') || 'You need teacher privileges to access this page.'}
          </p>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome') || 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  return <TeacherDashboard />;
}
