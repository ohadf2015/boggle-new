'use client';

import { BarChart3, Check, Globe2, GraduationCap, Pencil, Play, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';

interface MyListCardProps {
  lesson: LibraryLesson;
  classroomName?: string;
  index: number;
  sharing: boolean;
  onHost: () => void;
  onPractice: () => void;
  onResults: () => void;
  onEdit: () => void;
  onToggleShare: () => void;
}

const GHOST = cn(
  'inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-cream/50 px-2.5',
  'font-neo-display text-xs font-bold text-neo-white transition hover:border-neo-cream hover:bg-neo-cream/10',
  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cream',
);

export default function MyListCard({
  lesson,
  classroomName,
  index,
  sharing,
  onHost,
  onPractice,
  onResults,
  onEdit,
  onToggleShare,
}: MyListCardProps) {
  const { t } = useLanguage();
  const total = lesson.words.length;
  const defCount = lesson.words.filter((w) => w.definition).length;
  const isPublic = lesson.is_public === true;
  const shown = lesson.words.slice(0, 6);

  return (
    <article
      data-testid={`my-list-${lesson.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="flex min-w-0 flex-col gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 motion-safe:animate-pop-in [animation-fill-mode:both]"
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="font-neo-display text-base font-bold leading-tight text-neo-white [overflow-wrap:anywhere]">
            {lesson.name}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-neo-cream/75">
            <span lang={lesson.language}>{nativeLanguageName(lesson.language)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{t('eduLibrary.card.words', { count: total })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('teacher.lesson.definitionCoverage', { count: defCount, total })}</span>
            {classroomName && (
              <span data-testid={`lesson-classroom-${lesson.id}`} className="inline-flex items-center gap-1">
                <GraduationCap className="size-3" aria-hidden="true" />
                {classroomName}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('teacher.lesson.editLesson')}
          title={t('teacher.lesson.editLesson')}
          className="flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream/50 text-neo-white transition hover:border-neo-cream hover:bg-neo-cream/10"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="text-sm text-neo-white/80" dir="auto">
        {shown.map((w) => w.word).join(' · ')}
        {total > shown.length && <span className="text-neo-white/50"> · +{total - shown.length}</span>}
      </p>
      {lesson.remixed_from_title && (
        <p className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-neo-cream/70">
          <Sparkles className="size-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {lesson.remixed_from_author
              ? t('eduLibrary.remixedFrom', { title: lesson.remixed_from_title, author: lesson.remixed_from_author })
              : t('eduLibrary.remixedFromNoAuthor', { title: lesson.remixed_from_title })}
          </span>
        </p>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          data-testid={`lesson-host-${lesson.id}`}
          onClick={onHost}
          className={cn(GHOST, 'border-neo-cream text-sm sm:flex-1')}
        >
          <Play className="size-4 fill-current" aria-hidden="true" />
          {t('education.template.startGame')}
        </button>
        <button type="button" data-testid={`lesson-practice-${lesson.id}`} onClick={onPractice} className={GHOST} aria-label={t('education.practice.title')} title={t('education.practice.title')}>
          {t('eduLibrary.card.practice')}
        </button>
        <button type="button" data-testid={`lesson-results-${lesson.id}`} onClick={onResults} className={GHOST} aria-label={t('teacher.dashboard.viewReports')} title={t('teacher.dashboard.viewReports')}>
          <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
          {t('eduLibrary.card.results')}
        </button>
        <button
          type="button"
          data-testid={`lesson-share-${lesson.id}`}
          onClick={onToggleShare}
          disabled={sharing}
          aria-pressed={isPublic}
          title={t('eduLibrary.share.toggle')}
          className={cn(GHOST, isPublic && 'border-neo-lime ring-1 ring-neo-lime', sharing && 'opacity-60')}
        >
          {isPublic ? (
            <Check className="size-4 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Globe2 className={cn('size-4 shrink-0', sharing && 'motion-safe:animate-spin')} aria-hidden="true" />
          )}
          {isPublic ? t('eduLibrary.share.shared') : t('eduLibrary.share.share')}
        </button>
      </div>
    </article>
  );
}
