'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, Check, ClipboardList, Globe2, GraduationCap, Pencil, Play, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';
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

  return (
    <article
      data-testid={`my-list-${lesson.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="@container flex min-w-0 flex-col gap-2 rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light p-3 shadow-hard-lg motion-safe:animate-pop-in [animation-fill-mode:both]"
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
          className={cn(NB_SMALL, NB_BLOCK.navy, 'size-11 shrink-0 px-0')}
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

      <div className="mt-auto grid grid-cols-2 items-center gap-2 @[30rem]:flex">
        <button
          type="button"
          data-testid={`lesson-host-${lesson.id}`}
          onClick={onHost}
          className={cn(NB_SMALL, NB_BLOCK.navy, 'min-w-0 flex-1 border-neo-cream px-2.5 text-sm')}
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
      {assigning ? <AssignListDialog lessonId={lesson.id} onClose={() => setAssigning(false)} /> : null}
    </article>
  );
}
