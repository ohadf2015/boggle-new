'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, ClipboardList, Globe2, Pencil, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NB_SECONDARY } from '@/components/teacher/nb/nbStyles';
import { LIST_CARD_TITLE, ListCard } from '@/components/teacher/ListCard';
import { CardMenuAction, CardOverflowMenu } from '@/components/teacher/CardOverflowMenu';
import { ARCADE_BLOCK, arcadeAccentAt } from '@/lib/education/arcadeAccent';
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

/** One of the teacher's word lists: its name, one fact, Start a game, and a menu with everything else. */
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
  const isPublic = lesson.is_public === true;
  const accent = arcadeAccentAt(index);

  return (
    <ListCard
      data-testid={`my-list-${lesson.id}`}
      data-accent={accent}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="motion-safe:animate-pop-in [animation-fill-mode:both]"
      accentClass={ARCADE_BLOCK[accent]}
      titleText={lesson.name}
      title={
        <button type="button" data-testid={`lesson-open-${lesson.id}`} onClick={onEdit} className={LIST_CARD_TITLE}>
          <bdi>{lesson.name}</bdi>
        </button>
      }
      factTestId={`lesson-fact-${lesson.id}`}
      fact={
        <span>
          {t('eduLibrary.card.words', { count: lesson.words.length })}
          {' · '}
          {classroomName ? (
            <bdi data-testid={`lesson-classroom-${lesson.id}`}>{classroomName}</bdi>
          ) : (
            <span lang={lesson.language}>{nativeLanguageName(lesson.language)}</span>
          )}
        </span>
      }
      menu={
        <CardOverflowMenu label={t('eduLibrary.card.actions')} testId={`lesson-menu-${lesson.id}`}>
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
        <button type="button" data-testid={`lesson-host-${lesson.id}`} onClick={onHost} className={cn(NB_SECONDARY, 'min-h-14 w-full text-lg')}>
          <Play className="size-5 shrink-0 fill-current" aria-hidden="true" />
          {t('eduShell.home.startLive')}
        </button>
      }
    >
      {assigning ? <AssignListDialog lessonId={lesson.id} onClose={() => setAssigning(false)} /> : null}
    </ListCard>
  );
}
