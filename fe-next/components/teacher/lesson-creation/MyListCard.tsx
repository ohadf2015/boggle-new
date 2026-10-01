'use client';

import { BarChart3, Globe2, GraduationCap, Pencil, Play, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LibraryLesson } from '@/lib/education/libraryTypes';

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
  'inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-cream bg-neo-navy px-2.5',
  'font-neo-display text-xs font-bold uppercase text-neo-white shadow-hard-sm transition-all',
  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-none',
  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
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

  return (
    <article
      data-testid={`my-list-${lesson.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={cn(
        'group flex min-w-0 flex-col rounded-neo border-3 border-neo-cream bg-neo-navy-light shadow-hard',
        'transition-transform duration-150 hover:-translate-y-1 hover:shadow-hard-lg motion-safe:animate-pop-in [animation-fill-mode:both]',
      )}
    >
      <div className="flex min-w-0 items-start gap-2 border-b-2 border-neo-black/60 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-neo-display text-lg font-bold text-neo-white" title={lesson.name}>
            {lesson.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="rounded bg-neo-black/40 px-1.5 py-0.5 uppercase text-neo-white">{lesson.language}</span>
            <span className="rounded bg-neo-cyan/20 px-1.5 py-0.5 tabular-nums text-neo-cyan">
              {t('eduLibrary.card.words', { count: total })}
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.5',
                defCount === total && total > 0 ? 'bg-neo-lime/15 text-neo-lime' : 'bg-neo-white/10 text-neo-white/80',
              )}
            >
              {t('teacher.lesson.definitionCoverage', { count: defCount, total })}
            </span>
            {classroomName && (
              <span data-testid={`lesson-classroom-${lesson.id}`} className="inline-flex items-center gap-1 rounded bg-neo-lime/15 px-1.5 py-0.5 text-neo-lime">
                <GraduationCap className="size-3" aria-hidden="true" />
                {classroomName}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('teacher.lesson.editLesson')}
          className="flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream bg-neo-navy text-neo-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-neo-cream hover:text-neo-black"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-neo-white/80" dir="auto">
          {lesson.words.slice(0, 8).map((w) => w.word).join(' · ')}
          {total > 8 && <span className="text-neo-white/50"> · +{total - 8}</span>}
        </p>
        {lesson.remixed_from_title && (
          <p className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-neo-purple-light">
            <Sparkles className="size-3 shrink-0 text-neo-yellow" aria-hidden="true" />
            <span className="truncate">
              {lesson.remixed_from_author
                ? t('eduLibrary.remixedFrom', { title: lesson.remixed_from_title, author: lesson.remixed_from_author })
                : t('eduLibrary.remixedFromNoAuthor', { title: lesson.remixed_from_title })}
            </span>
          </p>
        )}

        <button
          type="button"
          data-testid={`lesson-host-${lesson.id}`}
          onClick={onHost}
          className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime font-neo-display text-sm font-bold uppercase text-neo-black shadow-hard transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <Play className="size-4 fill-current" aria-hidden="true" />
          {t('education.template.startGame')}
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" data-testid={`lesson-practice-${lesson.id}`} onClick={onPractice} className={GHOST} aria-label={t('education.practice.title')}>
            <span className="truncate">{t('eduLibrary.card.practice')}</span>
          </button>
          <button type="button" data-testid={`lesson-results-${lesson.id}`} onClick={onResults} className={GHOST} aria-label={t('teacher.dashboard.viewReports')}>
            <BarChart3 className="size-4 shrink-0 text-neo-cyan" aria-hidden="true" />
            <span className="truncate">{t('eduLibrary.card.results')}</span>
          </button>
          <button
            type="button"
            data-testid={`lesson-share-${lesson.id}`}
            onClick={onToggleShare}
            disabled={sharing}
            aria-pressed={isPublic}
            title={t('eduLibrary.share.toggle')}
            className={cn(GHOST, isPublic && 'border-neo-black bg-neo-lime text-neo-black', sharing && 'opacity-60')}
          >
            <Globe2 className={cn('size-4 shrink-0', sharing && 'motion-safe:animate-spin')} aria-hidden="true" />
            <span className="truncate">{isPublic ? t('eduLibrary.share.shared') : t('eduLibrary.share.share')}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
