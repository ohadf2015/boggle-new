'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, Check, ClipboardList, Globe2, GraduationCap, Pencil, Play, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import AssignListDialog from './library/AssignListDialog';

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

const GHOST = cn(NB_SMALL, NB_BLOCK.navy, 'px-2.5 text-xs');
const ACCENTS = [
  { name: 'lime', band: NB_BLOCK.lime, button: NB_BLOCK.lime, fill: 'bg-neo-lime', shadow: 'shadow-hard-lime-xl' },
  { name: 'pink', band: NB_BLOCK.pink, button: NB_BLOCK.pink, fill: 'bg-neo-pink', shadow: 'shadow-hard-pink-xl' },
  { name: 'cyan', band: NB_BLOCK.cyan, button: NB_BLOCK.cyan, fill: 'bg-neo-cyan', shadow: 'shadow-hard-cyan-xl' },
  { name: 'purple', band: NB_BLOCK.purple, button: NB_BLOCK.purple, fill: 'bg-neo-purple', shadow: 'shadow-hard-purple-xl' },
] as const;
const ICON = cn(NB_SMALL, NB_BLOCK.navy, 'size-11 shrink-0 px-0');

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
  const [assigning, setAssigning] = useState(false);
  const total = lesson.words.length;
  const defCount = lesson.words.filter((w) => w.definition).length;
  const isPublic = lesson.is_public === true;
  const shown = lesson.words.slice(0, 6);

  const accent = ACCENTS[index % ACCENTS.length];
  const defPct = total ? Math.round((defCount / total) * 100) : 0;

  return (
    <article
      data-testid={`my-list-${lesson.id}`}
      data-accent={accent.name}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={cn(
        '@container flex min-w-0 flex-col overflow-hidden rounded-neo-xl border-[3px] border-neo-cream bg-neo-navy-light motion-safe:animate-pop-in [animation-fill-mode:both]',
        'transition-transform motion-safe:hover:-translate-y-1',
        accent.shadow,
      )}
    >
      <header className={cn('flex min-w-0 items-start gap-2 border-b-[3px] border-neo-black px-3 py-2.5', accent.band)}>
        <span className="inline-flex shrink-0 -rotate-6 flex-col items-center rounded-neo border-[3px] border-neo-black bg-neo-black px-2 py-0.5 leading-none text-neo-cream shadow-hard">
          <span className="font-neo-display text-xl font-black tabular-nums" aria-hidden="true">{total}</span>
          <span className="sr-only">{t('eduLibrary.card.words', { count: total })}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="font-neo-display text-lg font-black leading-tight [overflow-wrap:anywhere]">
            <button
              type="button"
              data-testid={`lesson-open-${lesson.id}`}
              onClick={onEdit}
              className="text-start underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {lesson.name}
            </button>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs font-bold opacity-80">
            <span lang={lesson.language}>{nativeLanguageName(lesson.language)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('teacher.lesson.editLesson')}
          title={t('teacher.lesson.editLesson')}
          className={cn(NB_SMALL, NB_BLOCK.cream, 'size-11 shrink-0 px-0')}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
      <button
        type="button"
        data-testid={`lesson-words-${lesson.id}`}
        onClick={onEdit}
        aria-label={t('teacher.lesson.editLesson')}
        className="-m-1 rounded-neo p-1 text-start transition-colors hover:bg-neo-cream/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
      >
      <span className="flex flex-wrap gap-1.5" dir="auto">
        {shown.map((w, i) => (
          <span
            key={`${w.word}-${i}`}
            data-testid="word-tile"
            className={cn(
              'rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard',
              i % 2 ? 'rotate-1' : '-rotate-1',
            )}
          >
            {w.word}
          </span>
        ))}
        {total > shown.length && (
          <span className="rounded-neo border-2 border-dashed border-neo-cream/50 px-2 py-0.5 font-neo-display text-sm font-black text-neo-cream/70">
            +{total - shown.length}
          </span>
        )}
      </span>
      </button>

      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-neo-cream/80">
        <span className="h-2.5 w-16 overflow-hidden rounded-neo-pill border-2 border-neo-black bg-neo-black" aria-hidden="true">
          <span className={cn('block h-full', accent.fill)} style={{ width: `${defPct}%` }} />
        </span>
        <span>{t('teacher.lesson.definitionCoverage', { count: defCount, total })}</span>
        {classroomName && (
          <span data-testid={`lesson-classroom-${lesson.id}`} className={cn(NB_STICKER, NB_BLOCK.cream, 'shadow-none')}>
            <GraduationCap className="size-3" aria-hidden="true" />
            {classroomName}
          </span>
        )}
      </div>
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

      <div className="mt-auto grid grid-cols-2 items-center gap-2 @[30rem]:flex">
        <button
          type="button"
          data-testid={`lesson-host-${lesson.id}`}
          onClick={onHost}
          className={cn(NB_SMALL, accent.button, 'min-w-0 flex-1 px-2.5 text-sm')}
        >
          <Play className="size-4 shrink-0 fill-current" aria-hidden="true" />
          <span className="truncate">{t('eduShell.home.startLive')}</span>
        </button>
        <button type="button" data-testid={`lesson-assign-${lesson.id}`} onClick={() => setAssigning(true)} className={cn(GHOST, 'min-w-0 flex-1 text-sm')}>
          <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('eduShell.home.focus.assign')}</span>
        </button>
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" data-testid={`lesson-practice-${lesson.id}`} onClick={onPractice} className={ICON} aria-label={t('education.practice.title')} title={t('education.practice.title')}>
            <BookOpen className="size-4" aria-hidden="true" />
          </button>
          <button type="button" data-testid={`lesson-results-${lesson.id}`} onClick={onResults} className={ICON} aria-label={t('eduLibrary.card.results')} title={t('eduLibrary.card.results')}>
            <BarChart3 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid={`lesson-share-${lesson.id}`}
            onClick={onToggleShare}
            disabled={sharing}
            aria-pressed={isPublic}
            aria-label={isPublic ? t('eduLibrary.share.shared') : t('eduLibrary.share.share')}
            title={t('eduLibrary.share.toggle')}
            className={cn(ICON, isPublic && 'border-neo-lime ring-1 ring-neo-lime', sharing && 'opacity-60')}
          >
            {isPublic ? (
              <Check className="size-4 text-neo-lime" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Globe2 className={cn('size-4', sharing && 'motion-safe:animate-spin')} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      </div>
      {assigning ? <AssignListDialog lessonId={lesson.id} onClose={() => setAssigning(false)} /> : null}
    </article>
  );
}
