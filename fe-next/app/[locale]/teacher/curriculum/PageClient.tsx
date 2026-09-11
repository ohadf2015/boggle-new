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
import { EducationShell } from '@/components/education/shell/EducationShell';
import { EducationHeader } from '@/components/education/EducationHeader';
import { VocabularyLesson } from '@/lib/supabase/education';

/**
 * TeacherCurriculumInner - Teacher Curriculum Page
 *
 * Shows curriculum-aligned word lists with filtering and import functionality.
 */
function TeacherCurriculumInner() {
  const { language } = useLanguage();
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

  // The browser is a long filtered list — exactly the content the shell's one
  // scrolling region is for. The page itself stays put, so the filters at the
  // top of the list never scroll out of a teacher's reach.
  return (
    <main className="max-w-6xl mx-auto">
      <CurriculumWordListBrowser
        teacherId={user?.id}
        classroomId={classroomId}
        onImportSuccess={handleImportSuccess}
      />
    </main>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

/**
 * The shell wraps the GATE, not the other way round. `TeacherGate` renders a
 * loader while the role read is in flight and a denial when it resolves
 * negative, and neither of those is this file's markup — so a shell mounted
 * inside the gated child leaves the two states a teacher meets first scrolling
 * the document with no lock at all.
 */
export default function TeacherCurriculumPage() {
  return (
    <CurriculumShell>
      <TeacherGate>
        <TeacherCurriculumInner />
      </TeacherGate>
    </CurriculumShell>
  );
}

function CurriculumShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('teacher.curriculum.title')}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      {children}
    </EducationShell>
  );
}
