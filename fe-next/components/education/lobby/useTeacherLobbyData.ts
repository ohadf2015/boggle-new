/**
 * The teacher's classrooms and lessons, plus the one write the lobby can make
 * (a starter pack becomes a real lesson).
 *
 * Lifted out of `ClassroomGameLobby` so that file could lead with the mode
 * picker and still fit the size cap — behaviour is unchanged, including the
 * functional `setSelectedClassroomId` update that keeps the fetch from looping.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import {
  getLessons,
  getClassrooms,
  createLesson as createLessonAPI,
  type VocabularyLesson,
  type Classroom,
} from '@/lib/supabase/education';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';
import type { Language } from '@/lib/supabase/education/types';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface StarterPackInput {
  name: string;
  description: string;
  language: string;
  // The pack rows carry a looser shape than VocabularyWord; the converter owns it.
  words: Parameters<typeof convertPackWordsToLessonWords>[0];
}

export function useTeacherLobbyData(
  userId: string | undefined,
  t: Translate,
  initialLessonId?: string
) {
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingFromPack, setIsCreatingFromPack] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(
    initialLessonId ? [initialLessonId] : []
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  const fetchTeacherData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [lessonsResult, classroomsResult] = await Promise.all([
        getLessons(userId),
        getClassrooms(userId),
      ]);
      if (lessonsResult.data) {
        setLessons(lessonsResult.data);
        // PRE-SELECT THE NEWEST LIST. A greyed GO LIVE behind "pick a word
        // list first" is a choice dressed as an empty state — it is the reason
        // the round-1 lobby could not be played in one tap. `getLessons`
        // returns newest-first, and the newest list is the one a teacher who
        // just built it came here to run.
        //
        // Set BEFORE `setIsLoading(false)`, so the picker never paints a
        // blocked state and then unblocks a frame later (pitfall class 1); the
        // functional form keeps an explicit `?lessonId=` and the repeat-last
        // restore both authoritative.
        const newest = lessonsResult.data[0];
        if (newest) setSelectedLessonIds((prev) => (prev.length > 0 ? prev : [newest.id]));
      }
      if (classroomsResult.data) {
        setClassrooms(classroomsResult.data);
        if (classroomsResult.data.length > 0) {
          // Functional update so this callback does not depend on
          // selectedClassroomId — that dependency re-created the callback,
          // re-ran the effect and re-fetched forever.
          setSelectedClassroomId((prev) => prev || classroomsResult.data![0].id);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch teacher data:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    if (!userId) return;
    void fetchTeacherData();
  }, [userId, fetchTeacherData]);

  const createLessonFromPack = useCallback(
    async (pack: StarterPackInput) => {
      if (!userId) {
        toast.error(t('errors.loadFailed'));
        return;
      }
      setIsCreatingFromPack(true);
      try {
        const { data: newLesson, error } = await createLessonAPI({
          teacher_id: userId,
          classroom_id: null,
          name: pack.name,
          description: pack.description,
          language: pack.language as Language,
          words: convertPackWordsToLessonWords(pack.words),
          is_public: false,
          source_game_code: null,
        });
        if (error || !newLesson) {
          logger.error('Failed to create lesson from starter pack:', error);
          toast.error(error?.message || t('education.lesson.creationFailed'));
          return;
        }
        setLessons((prev) => [newLesson, ...prev]);
        setSelectedLessonIds([newLesson.id]);
        toast.success(t('education.lesson.created'));
      } catch (err) {
        logger.error('Exception creating lesson from starter pack:', err);
        toast.error(t('education.lesson.creationFailed'));
      } finally {
        setIsCreatingFromPack(false);
      }
    },
    [userId, t]
  );

  return {
    lessons,
    classrooms,
    isLoading,
    isCreatingFromPack,
    selectedLessonIds,
    setSelectedLessonIds,
    selectedClassroomId,
    setSelectedClassroomId,
    createLessonFromPack,
  };
}
