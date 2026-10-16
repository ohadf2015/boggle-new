'use client';

import { useId, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { labelLessonsForPicker } from '@/lib/education/lessonLabels';
import { LessonPicker } from '@/components/education/pickers/LessonPicker';
import type { VocabularyLesson } from '@/lib/supabase/education';
import { AssignmentStep } from './AssignmentStep';

interface AssignmentLessonStepProps {
  lessons: VocabularyLesson[];
  classrooms: { id: string; name: string }[];
  classroomId: string;
  classroomLanguage: string;
  selectedLessonId: string;
  isLoading: boolean;
  onSelect: (id: string) => void;
}

/** Step 1: which word list. Same-named lists across periods get their class appended. */
export function AssignmentLessonStep({
  lessons,
  classrooms,
  classroomId,
  classroomLanguage,
  selectedLessonId,
  isLoading,
  onSelect,
}: AssignmentLessonStepProps) {
  const { t, language } = useLanguage();
  const headingId = useId();
  const labels = useMemo(() => {
    const namesById: Record<string, string> = {};
    for (const c of classrooms) namesById[c.id] = c.name;
    return new Map(labelLessonsForPicker(lessons, namesById).map((l) => [l.id, l.label]));
  }, [lessons, classrooms]);

  return (
    <AssignmentStep step="list" n={1} label={t('teacher.assignment.lessonLabel')} headingId={headingId}>
      <div data-testid="assignment-lesson-picker" aria-busy={isLoading}>
        {isLoading ? (
          <div className="h-20 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light motion-safe:animate-pulse" />
        ) : (
          <LessonPicker
            mode="single"
            lessons={lessons}
            selectedIds={selectedLessonId ? [selectedLessonId] : []}
            onChange={(ids) => onSelect(ids[0] ?? '')}
            classLanguage={classroomLanguage}
            labels={labels}
            labelledBy={headingId}
            createHref={`/${language}/teacher/curriculum?classroomId=${classroomId}`}
          />
        )}
      </div>
    </AssignmentStep>
  );
}
