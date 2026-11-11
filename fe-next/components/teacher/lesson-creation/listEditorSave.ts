import toast from 'react-hot-toast';
import { publishList } from '@/lib/education/libraryClient';
import type { LibraryLesson } from '@/lib/education/libraryTypes';
import type { UseLessonsReturn } from '@/hooks/useVocabularyLesson';
import type { ListDraft } from './ListEditorSheet';

type T = (key: string, params?: Record<string, string | number>) => string;

export function lessonToDraft(lesson: LibraryLesson): ListDraft {
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

export function remixedFromOf(lesson: LibraryLesson | undefined) {
  return lesson?.remixed_from_title ? { title: lesson.remixed_from_title, author: lesson.remixed_from_author ?? null } : null;
}

export function shareResultToast(result: Awaited<ReturnType<typeof publishList>>, isPublic: boolean, t: T) {
  if (result.ok) toast.success(isPublic ? t('eduLibrary.share.nowPublic') : t('eduLibrary.share.nowPrivate'));
  else if (result.reason === 'moderation') toast.error(t('eduLibrary.share.blocked'));
  else toast.error(t('eduLibrary.share.failed'));
}

export async function saveExistingList(
  draft: ListDraft & { id: string },
  before: LibraryLesson | undefined,
  updateLesson: UseLessonsReturn['updateLesson'],
  t: T,
): Promise<boolean> {
  const result = await updateLesson(draft.id, {
    name: draft.name,
    description: draft.description || null,
    words: draft.words,
    gradeBand: draft.gradeBand,
    topic: draft.topic,
  });
  if (!result.success) {
    toast.error(result.error || t('teacher.lesson.error.updateFailed'));
    return false;
  }
  if ((before?.is_public === true) !== draft.isPublic) shareResultToast(await publishList(draft.id, draft.isPublic), draft.isPublic, t);
  else toast.success(t('eduLibrary.editor.savedToast', { name: draft.name }));
  return true;
}
