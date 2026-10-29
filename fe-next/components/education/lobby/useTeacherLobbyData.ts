/**
 * The teacher's classrooms and lessons, plus the one write the lobby can make
 * (a starter pack becomes a real lesson).
 *
 * Lifted out of `ClassroomGameLobby` so that file could lead with the mode
 * picker and still fit the size cap.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface RecentLessonPick {
  classroomId: string;
  lessonIds: string[];
  savedAt: number;
}

const RECENT_KEY = 'lexiclash_recent_game_settings';

/** Read synchronously so the first paint already holds the teacher's last list (an async read would flip the picker). */
export function readRecentLessonPicks(): RecentLessonPick[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is RecentLessonPick => !!e && Array.isArray(e.lessonIds) && typeof e.classroomId === 'string')
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  } catch {
    return [];
  }
}

/** This class's last-played lists (any language), else the newest list of any language; another class's history never leaks in. */
export function defaultLessonIdsFor(
  lessons: readonly Pick<VocabularyLesson, 'id' | 'language'>[],
  classroomId: string | null | undefined,
  recent: readonly RecentLessonPick[] = readRecentLessonPicks()
): string[] {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const pick of recent.filter((r) => r.classroomId === classroomId)) {
    const alive = pick.lessonIds.filter((id) => byId.has(id));
    if (alive.length === 0) continue;
    const language = byId.get(alive[0])?.language;
    return alive.filter((id) => byId.get(id)?.language === language);
  }
  return lessons[0] ? [lessons[0].id] : [];
}

export function useTeacherLobbyData(
  userId: string | undefined,
  t: Translate,
  initialLessonId?: string,
  initialClassroomId?: string
) {
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingFromPack, setIsCreatingFromPack] = useState(false);
  const [selectedLessonIds, setLessonIdsState] = useState<string[]>(
    initialLessonId ? [initialLessonId] : []
  );
  const [selectedClassroomId, setClassroomIdState] = useState<string>(
    initialClassroomId ?? ''
  );
  // An auto-picked list follows the class; one the teacher chose is never swapped out.
  const lessonPickIsAuto = useRef(!initialLessonId);
  const classroomIdRef = useRef(selectedClassroomId);
  const lessonsRef = useRef<VocabularyLesson[]>([]);

  const setSelectedLessonIds = useCallback((ids: string[] | ((prev: string[]) => string[])) => {
    lessonPickIsAuto.current = false;
    setLessonIdsState(ids);
  }, []);

  const autoPickLessonFor = useCallback((classroomId: string) => {
    if (!lessonPickIsAuto.current) return;
    setLessonIdsState(defaultLessonIdsFor(lessonsRef.current, classroomId));
  }, []);

  const setSelectedClassroomId = useCallback((id: string) => {
    classroomIdRef.current = id;
    setClassroomIdState(id);
    autoPickLessonFor(id);
  }, [autoPickLessonFor]);

  const fetchTeacherData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [lessonsResult, classroomsResult] = await Promise.all([
        getLessons(userId),
        getClassrooms(userId),
      ]);
      // Class before list, both BEFORE `setIsLoading(false)`, so the picker never
      // paints a blocked or wrong-language state that flips a frame later (pitfall class 1).
      if (lessonsResult.data) {
        lessonsRef.current = lessonsResult.data;
        setLessons(lessonsResult.data);
      }
      if (classroomsResult.data) {
        setClassrooms(classroomsResult.data);
        const prev = classroomIdRef.current;
        if (classroomsResult.data.length > 0 && !(prev && classroomsResult.data.some((c) => c.id === prev))) {
          classroomIdRef.current = classroomsResult.data[0].id;
          setClassroomIdState(classroomIdRef.current);
        }
      }
      if (lessonsResult.data) autoPickLessonFor(classroomIdRef.current);
    } catch (error) {
      logger.error('Failed to fetch teacher data:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t, autoPickLessonFor]);

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
        lessonsRef.current = [newLesson, ...lessonsRef.current];
        setSelectedLessonIds([newLesson.id]);
        toast.success(t('education.lesson.created'));
      } catch (err) {
        logger.error('Exception creating lesson from starter pack:', err);
        toast.error(t('education.lesson.creationFailed'));
      } finally {
        setIsCreatingFromPack(false);
      }
    },
    [userId, t, setSelectedLessonIds]
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
    fetchTeacherData,
  };
}
