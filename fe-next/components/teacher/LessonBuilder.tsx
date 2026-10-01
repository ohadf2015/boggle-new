'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { LessonCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';
import { createLessonAndAssign } from '@/lib/education/createLessonWithAssignment';
import { publishList } from '@/lib/education/libraryClient';
import { paginate } from '@/lib/education/library';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import LessonBuilderDraftPrompt from './LessonBuilderDraftPrompt';
import ListEditorSheet, { emptyListDraft, type ListDraft } from './lesson-creation/ListEditorSheet';
import MyListCard from './lesson-creation/MyListCard';
import { StarterPacksSection } from './StarterPacksSection';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';

export interface LessonBuilderProps {
  /** `?reviewWords=` from the after-game card; non-empty opens the editor pre-filled. */
  initialReviewWords?: string[];
  onBrowseDiscover?: () => void;
  hideDiscoverLink?: boolean;
}

const PAGE_SIZE = 9;

function lessonToDraft(lesson: LibraryLesson): ListDraft {
  return {
    id: lesson.id,
    name: lesson.name,
    description: lesson.description ?? '',
    language: lesson.language,
    gradeBand: lesson.grade_band ?? null,
    topic: lesson.topic ?? null,
    classroomId: lesson.classroom_id ?? '',
    isPublic: lesson.is_public === true,
    words: [...lesson.words],
  };
}

export default function LessonBuilder({ initialReviewWords, onBrowseDiscover, hideDiscoverLink }: LessonBuilderProps = {}) {
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

  const shareResultToast = useCallback((result: Awaited<ReturnType<typeof publishList>>, isPublic: boolean) => {
    if (result.ok) toast.success(isPublic ? t('eduLibrary.share.nowPublic') : t('eduLibrary.share.nowPrivate'));
    else if (result.reason === 'moderation') toast.error(t('eduLibrary.share.blocked'));
    else toast.error(t('eduLibrary.share.failed'));
  }, [t]);

  const handleSave = async (draft: ListDraft): Promise<boolean> => {
    const extras = { gradeBand: draft.gradeBand, topic: draft.topic };
    if (draft.id) {
      const before = lessons.find((l) => l.id === draft.id) as LibraryLesson | undefined;
      const result = await updateLesson(draft.id, { name: draft.name, description: draft.description || null, words: draft.words, ...extras });
      if (!result.success) {
        toast.error(result.error || t('teacher.lesson.error.updateFailed'));
        return false;
      }
      if ((before?.is_public === true) !== draft.isPublic) {
        shareResultToast(await publishList(draft.id, draft.isPublic), draft.isPublic);
      } else {
        toast.success(t('eduLibrary.editor.savedToast', { name: draft.name }));
      }
      setEditorOpen(false);
      return true;
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
    if (draft.isPublic && result.lesson?.id) shareResultToast(await publishList(result.lesson.id, true), true);
    clearDraft();
    setEditorOpen(false);
    setPage(0);
    return true;
  };

  const handleToggleShare = async (lesson: LibraryLesson) => {
    setSharingId(lesson.id);
    const next = lesson.is_public !== true;
    shareResultToast(await publishList(lesson.id, next), next);
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

  if (isLoading) {
    return <SkeletonGrid count={3} skeleton={LessonCardSkeleton} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-neo-display text-xl text-neo-white text-balance">{t('teacher.lesson.sectionTitle')}</h2>
          <p className="max-w-prose text-sm text-neo-white/80 text-pretty">{t('teacher.lesson.sectionHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hideDiscoverLink && <button
            type="button"
            onClick={browseDiscover}
            data-testid="lessons-browse-discover"
            className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-3 font-neo-display text-sm font-bold uppercase text-neo-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
          >
            <Compass className="size-4 text-neo-pink" aria-hidden="true" />
            {t('eduLibrary.tabs.discover')}
          </button>}
          <button
            type="button"
            data-testid="lessons-create"
            onClick={() => openCreate()}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cyan px-4 font-neo-display text-sm font-bold uppercase text-neo-black',
              'shadow-hard transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none',
            )}
          >
            <Plus className="size-5" strokeWidth={3} aria-hidden="true" />
            {t('eduLibrary.editor.newList')}
          </button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className={cn('space-y-4', isCreatingFromPack && 'pointer-events-none opacity-60')}>
          <div className="rounded-neo border-3 border-dashed border-neo-cream/40 bg-neo-navy-light/60 px-4 py-6 text-center">
            <h3 className="font-neo-display text-xl text-neo-white text-balance">{t('teacher.lesson.noLessons')}</h3>
            <p className="mx-auto mt-1 max-w-prose text-sm text-neo-white/80 text-pretty">{t('eduLibrary.myLists.emptyHint')}</p>
          </div>
          <StarterPacksSection onSelectPack={handleSelectStarterPack} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {paged.pageCount > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label={t('eduLibrary.pager.label')}>
              <button type="button" disabled={paged.page === 0} onClick={() => setPage(paged.page - 1)} className="min-h-10 rounded-neo border-2 border-neo-cream px-3 font-bold text-neo-white disabled:opacity-40">
                {t('eduLibrary.pager.prev')}
              </button>
              <span className="text-sm font-bold tabular-nums text-neo-white">
                {t('eduLibrary.pager.status', { page: paged.page + 1, total: paged.pageCount })}
              </span>
              <button type="button" disabled={paged.page >= paged.pageCount - 1} onClick={() => setPage(paged.page + 1)} className="min-h-10 rounded-neo border-2 border-neo-cream px-3 font-bold text-neo-white disabled:opacity-40">
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
        remixedFrom={
          editorInitial.id
            ? (() => {
                const l = lessons.find((x) => x.id === editorInitial.id) as LibraryLesson | undefined;
                return l?.remixed_from_title ? { title: l.remixed_from_title, author: l.remixed_from_author ?? null } : null;
              })()
            : null
        }
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
