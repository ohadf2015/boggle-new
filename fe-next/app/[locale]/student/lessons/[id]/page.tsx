/**
 * Student Lesson Practice Page
 *
 * Interactive flashcard-style practice for vocabulary lessons
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import { NeoLoader } from '@/components/ui/NeoLoader';
import LessonPractice from '@/components/student/LessonPractice';
import { cn } from '@/lib/utils';

export default function LessonPracticePage() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);

  const lessonId = params?.id as string;

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    if (!lessonId) {
      router.push(`/${language}/student`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, lessonId, router, language]);

  if (isChecking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user || !lessonId) {
    return null;
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        <LessonPractice lessonId={lessonId} />
      </div>
    </div>
  );
}
