/**
 * Student Dashboard Page
 *
 * Shows assigned vocabulary lessons with progress tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import { NeoLoader } from '@/components/ui/NeoLoader';
import StudentLessonView from '@/components/student/StudentLessonView';
import { cn } from '@/lib/utils';

export default function StudentPage() {
  const { user, profile, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, router, language]);

  if (isChecking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-neo-display text-neo-white mb-2">
            {t('student.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body">
            {t('student.dashboard.subtitle')}
          </p>
        </div>

        {/* Lesson List */}
        <StudentLessonView />
      </div>
    </div>
  );
}
