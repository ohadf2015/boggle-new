'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { useLessonDraft } from '@/hooks/useLessonDraft';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education';
import { ListGridSkeleton } from '@/components/teacher/routeLoading/TeacherSkeletons';
import { createLessonAndAssign } from '@/lib/education/createLessonWithAssignment';
import { publishList } from '@/lib/education/libraryClient';
import { paginate } from '@/lib/education/library';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import LessonBuilderDraftPrompt from './LessonBuilderDraftPrompt';
import ListEditorSheet, { emptyListDraft, type ListDraft } from './lesson-creation/ListEditorSheet';
import MyListCard from './lesson-creation/MyListCard';
import { NB_PRIMARY } from './nb/nbStyles';
import { lessonToDraft, remixedFromOf, saveExistingList, shareResultToast } from './lesson-creation/listEditorSave';
import { StarterPacksSection } from './StarterPacksSection';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';

export interface LessonBuilderProps {
  /** `?reviewWords=` from the after-game card; non-empty opens the editor pre-filled. */
  initialReviewWords?: string[];
  onBrowseDiscover?: () => void;
  hideDiscoverLink?: boolean;
  /** The page title, set in the New list row. */
  heading?: ReactNode;
  onListCount?: (count: number) => void;
}

const PAGE_SIZE = 6;
const PAGER_BUTTON = 'min-h-10 rounded-neo border-2 border-edu-line px-3 font-bold text-edu-ink hover:border-edu-line disabled:opacity-40';

export default function LessonBuilder({ initialReviewWords, onBrowseDiscover, hideDiscoverLink, heading, onListCount }: LessonBuilderProps = {}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons, isLoading, createLesson, updateLesson } = useLessons();
  const { classrooms } = useClassrooms();
  const { user } = useAuth();
  const { hasRestorableDraft, saveDraft, clearDraft, restoreDraft, draftAge } = useLessonDraft();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<ListDraft>(() => emptyListDraft(language as Language));
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isCreatingFromPack, setIsCreatingFromPack] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const latestDraft = useRef<ListDraft | null>(null);

  const openCreate = useCallback((seed?: Partial<ListDraft>) => {
    setEditorInitial({ ...emptyListDraft(language as Language), ...seed });
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }, [language]);

  useEffect(() => {
    if (editorOpen && !editorInitial.id && hasRestorableDraft) setShowDraftPrompt(true);
  }, [editorOpen, editorInitial.id, hasRestorableDraft]);

  const seededReviewWordsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialReviewWords?.length) return;
    const signature = initialReviewWords.join('|');
    if (seededReviewWordsRef.current === signature) return;
    seededReviewWordsRef.current = signature;
    openCreate({
      name: t('teacher.lesson.reviewSetName'),
      description: t('teacher.lesson.reviewSetDescription'),
      words: initialReviewWords.map((word) => ({ word, canIntegrate: true })),
    });
  }, [initialReviewWords, t, openCreate]);

  useEffect(() => {
    if (!editorOpen || editorInitial.id) return;
    const interval = setInterval(() => {
      const d = latestDraft.current;
      if (!d || (!d.name && d.words.length === 0)) return;
      saveDraft({ name: d.name, description: d.description, language: d.language, classroomId: d.classroomId, words: d.words });
    }, 30000);
    return () => clearInterval(interval);
  }, [editorOpen, editorInitial.id, saveDraft]);

  const handleRestoreDraft = useCallback(() => {
    const d = restoreDraft();
    if (d) {
      setEditorInitial({ ...emptyListDraft(d.language), name: d.name, description: d.description, classroomId: d.classroomId, words: d.words, id: undefined });
      setEditorKey((k) => k + 1);
      toast.success(t('teacher.lesson.resumeDraft'));
    }
    setShowDraftPrompt(false);
  }, [restoreDraft, t]);

  const formatDraftAge = (ageMs: number | null): string => {
    if (!ageMs) return '';
    const minutes = Math.floor(ageMs / 60000);
    return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
  };

  const handleSave = async (draft: ListDraft): Promise<boolean> => {
    const extras = { gradeBand: draft.gradeBand, topic: draft.topic };
    if (draft.id) {
      const before = lessons.find((l) => l.id === draft.id) as LibraryLesson | undefined;
      const ok = await saveExistingList({ ...draft, id: draft.id }, before, updateLesson, t);
      if (ok) setEditorOpen(false);
      return ok;
    }

    const result = await createLessonAndAssign({
      lesson: {
        name: draft.name,
        description: draft.description || undefined,
        language: draft.language,
        words: draft.words,
        classroomId: draft.classroomId || undefined,
      },
      teacherId: user?.id ?? '',
      createLesson: (data) => createLesson({ ...data, ...extras }),
    });
    if (!result.success) {
      toast.error(result.error || t('teacher.lesson.error.createFailed'));
      return false;
    }
    const classroomName = classrooms.find((c) => c.id === draft.classroomId)?.name;
    if (result.assigned && classroomName) toast.success(t('teacher.lesson.savedAndAssigned', { classroom: classroomName }));
    else if (result.assignmentError) toast.error(t('teacher.lesson.savedNotAssigned', { classroom: classroomName ?? '' }));
    else toast.success(t('eduLibrary.editor.savedToast', { name: draft.name }));
    if (draft.isPublic && result.lesson?.id) shareResultToast(await publishList(result.lesson.id, true), true, t);
    clearDraft();
    setEditorOpen(false);
    setPage(0);
    return true;
  };

  const handleToggleShare = async (lesson: LibraryLesson) => {
    setSharingId(lesson.id);
    const next = lesson.is_public !== true;
    shareResultToast(await publishList(lesson.id, next), next, t);
    setSharingId(null);
  };

  const handleSelectStarterPack = useCallback(
    async (pack: { name: string; description: string; language: string; words: Parameters<typeof convertPackWordsToLessonWords>[0] }) => {
      setIsCreatingFromPack(true);
      const result = await createLesson({
        name: pack.name,
        description: pack.description,
        language: pack.language as Language,
        words: convertPackWordsToLessonWords(pack.words),
      });
      setIsCreatingFromPack(false);
      if (result.success) toast.success(t('education.lesson.created'));
      else toast.error(result.error || t('education.lesson.creationFailed'));
    },
    [createLesson, t],
  );

  const browseDiscover = onBrowseDiscover ?? (() => router.push(`/${language}/teacher/curriculum?tab=discover`));
  const paged = useMemo(() => paginate(lessons as LibraryLesson[], page, PAGE_SIZE), [lessons, page]);

  useEffect(() => {
    if (!isLoading) onListCount?.(lessons.length);
  }, [isLoading, lessons.length, onListCount]);

  if (isLoading) {
    return <ListGridSkeleton />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {heading}
        <h2 className="sr-only">{t('teacher.lesson.sectionTitle')}</h2>
        <div className="flex flex-wrap gap-2">
          {!hideDiscoverLink && <button
            type="button"
            onClick={browseDiscover}
            data-testid="lessons-browse-discover"
            className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-edu-line px-3 font-neo-display text-sm font-bold text-edu-ink transition hover:border-edu-line"
          >
            <Compass className="size-4" aria-hidden="true" />
            {t('eduLibrary.tabs.discover')}
          </button>}
          <button
            type="button"
            data-testid="lessons-create"
            onClick={() => openCreate()}
            className={NB_PRIMARY}
          >
            <Plus className="size-5" strokeWidth={3} aria-hidden="true" />
            {t('eduLibrary.editor.newList')}
          </button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className={cn('space-y-4', isCreatingFromPack && 'pointer-events-none opacity-60')}>
          <div data-testid="lessons-empty" className="edu-card px-4 py-6 text-center">
            <h3 className="font-neo-display text-xl text-edu-ink text-balance">{t('teacher.lesson.noLessons')}</h3>
            <p className="mx-auto mt-1 max-w-prose text-sm text-edu-ink/80 text-pretty">{t('eduLibrary.myLists.emptyHint')}</p>
          </div>
          <StarterPacksSection onSelectPack={handleSelectStarterPack} showTrialChecklist />
        </div>
      ) : (
        <>
          <div className="@container">
          <div data-testid="my-lists-grid" className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {paged.items.map((lesson, i) => (
              <MyListCard
                key={lesson.id}
                lesson={lesson}
                index={i}
                classroomName={lesson.classroom_id ? classrooms.find((c) => c.id === lesson.classroom_id)?.name : undefined}
                sharing={sharingId === lesson.id}
                onHost={() => router.push(`/${language}/education/classroom-game?lessonId=${lesson.id}`)}
                onPractice={() => router.push(`/${language}/student/lessons/${lesson.id}`)}
                onResults={() =>
                  router.push(
                    lesson.classroom_id
                      ? `/${language}/teacher/reports?classroomId=${lesson.classroom_id}`
                      : `/${language}/teacher/reports`,
                  )
                }
                onEdit={() => {
                  setEditorInitial(lessonToDraft(lesson));
                  setEditorKey((k) => k + 1);
                  setEditorOpen(true);
                }}
                onToggleShare={() => void handleToggleShare(lesson)}
              />
            ))}
          </div>
          </div>
          {paged.pageCount > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label={t('eduLibrary.pager.label')}>
              <button type="button" disabled={paged.page === 0} onClick={() => setPage(paged.page - 1)} className={PAGER_BUTTON}>
                {t('eduLibrary.pager.prev')}
              </button>
              <span className="text-sm font-bold tabular-nums text-edu-ink">
                {t('eduLibrary.pager.status', { page: paged.page + 1, total: paged.pageCount })}
              </span>
              <button type="button" disabled={paged.page >= paged.pageCount - 1} onClick={() => setPage(paged.page + 1)} className={PAGER_BUTTON}>
                {t('eduLibrary.pager.next')}
              </button>
            </nav>
          )}
        </>
      )}

      <ListEditorSheet
        key={editorKey}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editorInitial}
        classrooms={classrooms}
        onSave={handleSave}
        remixedFrom={editorInitial.id ? remixedFromOf(lessons.find((x) => x.id === editorInitial.id) as LibraryLesson | undefined) : null}
        onDraftChange={(d) => { latestDraft.current = d; }}
      />

      <LessonBuilderDraftPrompt
        open={showDraftPrompt}
        onOpenChange={setShowDraftPrompt}
        onRestore={handleRestoreDraft}
        onDiscard={() => { clearDraft(); setShowDraftPrompt(false); }}
        formattedAge={formatDraftAge(draftAge)}
        t={t}
      />
    </div>
  );
}
