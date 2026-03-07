'use client';

import { GraduationCap, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

interface ClassroomModeBannerProps {
  lessonData: LessonData | null;
}

/**
 * Persistent banner shown during classroom game sessions.
 *
 * Provides visual continuity with the education section so teachers and
 * students know they're still in a classroom context, even though the
 * game itself runs on the multiplayer page.
 */
export function ClassroomModeBanner({ lessonData }: ClassroomModeBannerProps) {
  const { t } = useLanguage();

  const lessonNames = lessonData?.lessonName || '';
  const wordCount = lessonData?.vocabularyWords?.length || 0;

  return (
    <div
      className={cn(
        'w-full px-4 py-2',
        'bg-neo-cyan/15 border-b-3 border-neo-cyan/40',
        'flex items-center justify-center gap-3 flex-wrap',
        'text-sm font-neo-body'
      )}
    >
      <div className="flex items-center gap-2 text-neo-cyan font-bold">
        <GraduationCap className="w-4 h-4" />
        <span>{t('education.classroomGame.classroomSession')}</span>
      </div>

      {lessonNames && (
        <>
          <span className="text-neo-white/30">|</span>
          <div className="flex items-center gap-1.5 text-neo-white/70">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px] sm:max-w-[400px]">{lessonNames}</span>
          </div>
        </>
      )}

      {wordCount > 0 && (
        <>
          <span className="text-neo-white/30">|</span>
          <span className="text-neo-white/50">
            {wordCount} {t('education.classroomGame.words')}
          </span>
        </>
      )}
    </div>
  );
}
