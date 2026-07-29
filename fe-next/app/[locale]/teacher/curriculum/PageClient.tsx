/**
 * Teacher Curriculum PageClient
 *
 * Client-side component for the teacher curriculum page.
 * Displays curriculum-aligned word lists that teachers can import to their lessons.
 */

'use client';

import React, { useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CurriculumWordListBrowser } from '@/components/teacher/curriculum/CurriculumWordListBrowser';
import { VocabularyLesson } from '@/lib/supabase/education';

/**
 * TeacherCurriculumInner - Teacher Curriculum Page
 *
 * Shows curriculum-aligned word lists with filtering and import functionality.
 */
function TeacherCurriculumInner() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get optional classroom context from URL
  const classroomId = searchParams.get('classroomId') || undefined;

  // Handle successful import - navigate to lesson or show success
  const handleImportSuccess = useCallback(
    (lesson: VocabularyLesson) => {
      // Navigate to the new lesson
      if (classroomId) {
        router.push(
          `/${language}/teacher/classroom/${classroomId}/lesson/${lesson.id}`
        );
      } else {
        // Just show success - lesson is created without classroom association
        // User can access it from their lessons list
      }
    },
    [classroomId, language, router]
  );

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6 lg:p-8">
      <main className="max-w-6xl mx-auto">
        <CurriculumWordListBrowser
          teacherId={user?.id}
          classroomId={classroomId}
          onImportSuccess={handleImportSuccess}
        />
      </main>
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherCurriculumPage() {
  return <TeacherGate><TeacherCurriculumInner /></TeacherGate>;
}
