/**
 * Teacher Library PageClient (route kept at /teacher/curriculum — the shell's Library tab).
 * My lists + Discover: teacher-made and LexiClash-verified word lists.
 */

'use client';

import React, { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherLibrary } from '@/components/teacher/lesson-creation/library/TeacherLibrary';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { EducationHeader } from '@/components/education/EducationHeader';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import logger from '@/utils/logger';

function TeacherCurriculumInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroomId') || undefined;

  // Never route here: the copy is already in My lists on this page, and `/classroom/{id}/lesson/{id}` 404s to the homepage.
  const handleImportSuccess = useCallback(
    (lesson: LibraryLesson) => logger.debug('library copy landed in My lists', { lessonId: lesson.id, classroomId }),
    [classroomId],
  );

  // The shell owns the one scroll region; Discover's search bar is sticky inside it.
  return (
    <main className="max-w-6xl mx-auto">
      <TeacherLibrary teacherId={user?.id} classroomId={classroomId} onImportSuccess={handleImportSuccess} />
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
      scrollRegionLabel={t('teacher.nav.lessons')}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      {children}
    </EducationShell>
  );
}
