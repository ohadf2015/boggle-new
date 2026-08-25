'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ClassroomWithMembers } from '@/lib/supabase/education';

interface StudentsPresentStripProps {
  classrooms: ClassroomWithMembers[];
}

/**
 * Shows a visual strip when students are present in the teacher's classrooms.
 * Displays the total student count and encourages starting a game.
 *
 * Renders only when:
 * - At least one classroom exists AND
 * - Total member_count across all classrooms > 0
 *
 * Uses the first non-empty classroom name for context.
 */
export default function StudentsPresentStrip({ classrooms }: StudentsPresentStripProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  // Calculate total students and find first non-empty classroom
  const { totalCount, primaryClassroom } = useMemo(() => {
    let count = 0;
    let primary: ClassroomWithMembers | null = null;

    for (const classroom of classrooms) {
      count += classroom.member_count;
      if (!primary && classroom.member_count > 0) {
        primary = classroom;
      }
    }

    return { totalCount: count, primaryClassroom: primary };
  }, [classrooms]);

  // Don't render if no students present
  if (totalCount === 0 || !primaryClassroom) {
    return null;
  }

  return (
    <div
      data-testid="students-present-strip"
      className={cn(
        'w-full flex items-center gap-4 p-5 rounded-neo border-3 border-black',
        'bg-neo-cyan shadow-hard text-left',
        'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
        isRTL && 'flex-row-reverse'
      )}
    >
      <div className="w-12 h-12 rounded-neo bg-black border-2 border-black flex items-center justify-center shadow-hard-sm shrink-0">
        <Users className="w-6 h-6 text-neo-cyan" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-neo-display font-black text-black uppercase tracking-tight">
          {t('teacher.dashboard.studentsPresentTitle', {
            count: totalCount,
            classroom: primaryClassroom.name.toUpperCase(),
          })}
        </h3>
        <p className="text-sm text-black/70 font-neo-body font-bold mt-0.5">
          {t('teacher.dashboard.studentsPresentDescription')}
        </p>
      </div>
    </div>
  );
}
