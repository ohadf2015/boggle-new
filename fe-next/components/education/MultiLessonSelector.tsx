'use client';

import { useMemo, useCallback } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { VocabularyLesson } from '@/lib/supabase/education';

export interface MultiLessonSelectorProps {
  /** Available lessons to select from */
  lessons: VocabularyLesson[];
  /** Currently selected lesson IDs */
  selectedLessonIds: string[];
  /** Callback when selection changes */
  onSelectChange: (lessonIds: string[]) => void;
  /** Optional className for the container */
  className?: string;
}

/**
 * MultiLessonSelector - Select multiple lessons for classroom games
 *
 * Allows teachers to select 1 or more lessons to combine vocabulary
 * words for a multiplayer game. Shows word count for each lesson.
 *
 * Neo-brutalist styling with hard shadows and chunky borders.
 */
export function MultiLessonSelector({
  lessons,
  selectedLessonIds,
  onSelectChange,
  className,
}: MultiLessonSelectorProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  // Calculate playable word count for each lesson
  const lessonsWithCounts = useMemo(() => {
    return lessons.map((lesson) => ({
      ...lesson,
      playableWordCount: lesson.words?.filter((w) => w.canIntegrate).length || 0,
    }));
  }, [lessons]);

  // Handle lesson selection toggle
  const handleToggleLesson = useCallback((lessonId: string) => {
    if (selectedLessonIds.includes(lessonId)) {
      onSelectChange(selectedLessonIds.filter((id) => id !== lessonId));
    } else {
      onSelectChange([...selectedLessonIds, lessonId]);
    }
  }, [selectedLessonIds, onSelectChange]);

  const allSelected = lessons.length > 0 && selectedLessonIds.length === lessons.length;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(lessons.map((l) => l.id));
    }
  }, [allSelected, lessons, onSelectChange]);

  if (lessons.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <BookOpen className="w-12 h-12 text-neo-white mx-auto mb-3" />
        <p className="text-neo-white font-neo-body">
          {t('education.classroomGame.noLessonsAvailable')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with selection count and Select All */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-neo-display text-neo-white">
          {t('education.classroomGame.selectLessons')}
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className={cn(
              'text-sm font-bold px-4 py-2.5 rounded-neo border-neo border-neo-black transition-all',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
              allSelected
                ? 'bg-neo-white/20 text-neo-white hover:bg-neo-white/30'
                : 'bg-neo-cyan/20 text-neo-cyan hover:bg-neo-cyan/30'
            )}
          >
            {allSelected
              ? t('education.classroomGame.deselectAll')
              : t('education.classroomGame.selectAllLessons')}
          </button>
          <span className="text-sm text-neo-cyan font-bold">
            {t('education.classroomGame.lessonsSelected', { count: selectedLessonIds.length })}
          </span>
        </div>
      </div>

      {/* Lesson options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lessonsWithCounts.map((lesson) => {
          const isSelected = selectedLessonIds.includes(lesson.id);

          return (
            <button
              key={lesson.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => handleToggleLesson(lesson.id)}
              className={cn(
                'relative p-4 rounded-neo border-neo border-neo-black',
                'transition-all duration-150',
                'text-start',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-neo-cyan text-neo-black shadow-hard'
                  : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm',
                'active:shadow-hard-pressed active:translate-y-0.5'
              )}
            >
              {/* Checkmark for selected */}
              {isSelected && (
                <div
                  className={cn(
                    'absolute top-2 bg-neo-black rounded-full p-1',
                    isRTL ? 'left-2' : 'right-2'
                  )}
                >
                  <Check className="w-4 h-4 text-neo-cyan" />
                </div>
              )}

              {/* Lesson name */}
              <div className="flex items-start gap-2 mb-2">
                <BookOpen className={cn('w-5 h-5 shrink-0 mt-0.5', isSelected ? 'text-neo-black' : 'text-neo-pink')} />
                <span className="font-bold font-neo-display">
                  {lesson.name}
                </span>
              </div>

              {/* Word count */}
              <div className={cn('text-sm', isSelected ? 'text-neo-black/70' : 'text-neo-white')}>
                {lesson.playableWordCount} {lesson.playableWordCount === 1
                  ? t('education.lesson.word')
                  : t('education.lesson.words', { count: lesson.playableWordCount })}
              </div>

              {/* Description if available */}
              {lesson.description && (
                <p className={cn('text-xs mt-2', isSelected ? 'text-neo-black/60' : 'text-neo-white')}>
                  {lesson.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      {selectedLessonIds.length > 1 && (
        <p className="text-sm text-neo-white font-neo-body">
          {t('education.classroomGame.multiLessonHelp')}
        </p>
      )}
    </div>
  );
}
