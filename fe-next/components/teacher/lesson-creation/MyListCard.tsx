'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, ClipboardList, Globe2, Pencil, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SECONDARY } from '@/components/teacher/nb/nbStyles';
import { LIST_CARD_TITLE, ListCard } from '@/components/teacher/ListCard';
import { CardMenuAction, CardOverflowMenu } from '@/components/teacher/CardOverflowMenu';
import { arcadeAccentAt } from '@/lib/education/arcadeAccent';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { BidiText } from '@/components/teacher/classroom/BidiText';
import AssignListDialog from './library/AssignListDialog';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

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

const CHIPS = 6;

/** One of the teacher's word lists: a color band with its count and name, its first words, Start a game, and a menu with everything else. */
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
  const { t, language } = useLanguage();
  const [assigning, setAssigning] = useState(false);
  const isPublic = lesson.is_public === true;
  const accent = arcadeAccentAt(index);
  const total = lesson.words.length;
  const defCount = lesson.words.filter((w) => w.definition).length;
  const remix = lesson.remixed_from_title
    ? lesson.remixed_from_author
      ? t('eduLibrary.remixedFrom', { title: lesson.remixed_from_title, author: lesson.remixed_from_author })
      : t('eduLibrary.remixedFromNoAuthor', { title: lesson.remixed_from_title })
    : null;
  const menuHeader = (
    <div role="none" data-testid={`lesson-menu-header-${lesson.id}`} className="space-y-0.5 px-3 pb-2 pt-1.5 font-neo-body text-xs font-bold text-edu-ink/70">
      <p>{t('teacher.lesson.definitionCoverage', { count: defCount, total })}</p>
      {remix ? <p className="[overflow-wrap:anywhere]">{remix}</p> : null}
    </div>
  );

  return (
    <ListCard
      data-testid={`my-list-${lesson.id}`}
      data-accent={accent}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="motion-safe:animate-pop-in [animation-fill-mode:both]"
      color={accent}
      titleText={lesson.name}
      title={
        <button type="button" data-testid={`lesson-open-${lesson.id}`} onClick={onEdit} className={LIST_CARD_TITLE}>
          <BidiText>{lesson.name}</BidiText>
        </button>
      }
      lead={
        <span className="inline-flex shrink-0 -rotate-6 flex-col items-center self-start rounded-neo border-[3px] border-neo-black bg-neo-black px-2 py-0.5 leading-none text-neo-cream shadow-hard">
          <span className="font-neo-display text-xl font-black tabular-nums" aria-hidden="true">{total}</span>
        </span>
      }
      sub={
        <p data-testid={`lesson-fact-${lesson.id}`} className="mt-0.5 font-neo-body text-xs font-bold opacity-85">
          <span className="sr-only">{t(pluralKeyOf('eduLibrary.card.words', total, language), { count: total })} · </span>
          {classroomName ? (
            <BidiText data-testid={`lesson-classroom-${lesson.id}`}>{classroomName}</BidiText>
          ) : (
            <span lang={lesson.language}>{nativeLanguageName(lesson.language)}</span>
          )}
        </p>
      }
      menu={
        <CardOverflowMenu label={t('eduLibrary.card.actions')} testId={`lesson-menu-${lesson.id}`} header={menuHeader}>
          <CardMenuAction icon={Pencil} testId={`lesson-edit-${lesson.id}`} onSelect={onEdit}>{t('teacher.lesson.editLesson')}</CardMenuAction>
          <CardMenuAction icon={ClipboardList} testId={`lesson-assign-${lesson.id}`} onSelect={() => setAssigning(true)}>{t('eduShell.home.focus.assign')}</CardMenuAction>
          <CardMenuAction icon={BookOpen} testId={`lesson-practice-${lesson.id}`} onSelect={onPractice}>{t('education.practice.title')}</CardMenuAction>
          <CardMenuAction icon={BarChart3} testId={`lesson-results-${lesson.id}`} onSelect={onResults}>{t('eduLibrary.card.results')}</CardMenuAction>
          <CardMenuAction icon={Globe2} testId={`lesson-share-${lesson.id}`} onSelect={onToggleShare} disabled={sharing} checked={isPublic}>
            {isPublic ? t('eduLibrary.share.shared') : t('eduLibrary.share.toggle')}
          </CardMenuAction>
        </CardOverflowMenu>
      }
      action={
        <button type="button" data-testid={`lesson-host-${lesson.id}`} onClick={onHost} className={cn(NB_SECONDARY, NB_BLOCK[accent], 'min-h-14 w-full text-lg')}>
          <Play className="size-5 shrink-0 fill-current" aria-hidden="true" />
          {t('eduShell.home.startLive')}
        </button>
      }
    >
      <ul className="flex flex-wrap gap-1.5" dir="auto">
        {lesson.words.slice(0, CHIPS).map((w, i) => (
          <li
            key={`${w.word}-${i}`}
            data-testid="word-tile"
            className={cn(
              'rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard',
              i % 2 ? 'rotate-1' : '-rotate-1',
            )}
          >
            {w.word}
          </li>
        ))}
        {total > CHIPS ? (
          <li className="rounded-neo border-2 border-dashed border-edu-line px-2 py-0.5 font-neo-display text-sm font-black text-edu-ink/70">
            +{total - CHIPS}
          </li>
        ) : null}
      </ul>
      {assigning ? <AssignListDialog lessonId={lesson.id} onClose={() => setAssigning(false)} /> : null}
    </ListCard>
  );
}
