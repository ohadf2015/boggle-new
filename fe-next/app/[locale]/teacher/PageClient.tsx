'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function TeacherDashboardInner() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  // Check if user is teacher or admin — accepts user_role OR legacy is_admin flag
  const isTeacher =
    profile?.user_role === 'teacher' ||
    profile?.user_role === 'admin' ||
    profile?.is_admin === true;
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
          text={t('common.loading')}
        />
      </div>
    );
  }

  // Not authenticated or not teacher
  if (!user || !isTeacher) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-neo-cream border-3 border-black rounded-neo shadow-hard max-w-sm w-full mx-4">
          <div className="w-16 h-16 rounded-neo bg-neo-lime border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-hard-sm">
            <Shield className="w-9 h-9 text-black" />
          </div>
          <h1 className="text-2xl font-neo-display font-black text-black mb-2">
            {t('teacher.accessRequired')}
          </h1>
          <p className="text-black/60 font-bold mb-6">
            {t('teacher.accessDenied')}
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4 me-2 rtl:scale-x-[-1]" />
            {t('common.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  return <TeacherDashboard />;
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
