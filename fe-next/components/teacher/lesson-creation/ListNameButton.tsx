'use client';

import { useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import ListEditorSheet from './ListEditorSheet';
import { lessonToDraft, remixedFromOf, saveExistingList } from './listEditorSave';

interface ListNameButtonProps {
  lessonId: string | null | undefined;
  name: string;
  className?: string;
  children?: ReactNode;
}

/** A word-list name anywhere in the teacher area: tap it to see and edit the list. */
export default function ListNameButton({ lessonId, name, className, children }: ListNameButtonProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!lessonId) return <span dir="auto" className={className}>{children ?? name}</span>;
  return (
    <>
      <button
        type="button"
        data-testid={`open-list-${lessonId}`}
        onClick={() => setOpen(true)}
        title={t('teacher.lesson.editLesson')}
        dir="auto"
        className={cn(
          'min-w-0 text-start underline decoration-neo-cream/40 decoration-2 underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
          className,
        )}
      >
        {children ?? name}
      </button>
      {open ? <ListEditorById lessonId={lessonId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Mounted on first tap only, so a screen full of names doesn't load every list up front.
function ListEditorById({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const { t } = useLanguage();
  const { lessons, updateLesson } = useLessons();
  const { classrooms } = useClassrooms();
  const lesson = lessons.find((l) => l.id === lessonId) as LibraryLesson | undefined;
  if (!lesson) return null;
  return (
    <ListEditorSheet
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      initial={lessonToDraft(lesson)}
      classrooms={classrooms}
      remixedFrom={remixedFromOf(lesson)}
      onSave={async (draft) => {
        const ok = await saveExistingList({ ...draft, id: lessonId }, lesson, updateLesson, t);
        if (ok) onClose();
        return ok;
      }}
    />
  );
}
