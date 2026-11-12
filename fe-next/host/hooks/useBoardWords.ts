import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { DIFFICULTIES } from '@/utils/consts';
import { fetchWithAuth } from '@/utils/authFetch';
import { parseStudyCards } from '@/shared/utils/studyCards';
import type { DifficultyLevel, Language } from '@/types';

export type LessonWordsStatus = 'local' | 'none' | 'loading' | 'ready' | 'error';

/** The room record's lesson words: the same teacher-only source the projector wall reads. */
async function fetchLessonWords(gameCode: string): Promise<string[]> {
  const res = await fetchWithAuth(`/api/education/classroom/live-game/cards?code=${encodeURIComponent(gameCode)}`, {
    requireSession: true,
  });
  if (!res.ok || res.status !== 200) throw new Error(`lesson words ${res.status}`);
  const body = (await res.json()) as { cards?: unknown };
  return parseStudyCards(body?.cards).map((c) => c.word);
}

/**
 * Words the host embeds in the board. A classroom without the teacher's local lesson copy (second tab,
 * reopened link) loads them from the room record; until it has them, the round must not start on random words.
 */
export function useBoardWords(args: {
  socket: Socket | null | undefined;
  gameCode: string;
  roomLanguage: Language;
  difficulty: DifficultyLevel;
  lessonWords: string[] | undefined;
  isClassroomMode: boolean;
  setWordsForBoard: (words: string[]) => void;
}) {
  const { socket, gameCode, roomLanguage, difficulty, lessonWords, isClassroomMode, setWordsForBoard } = args;
  const hasLocal = !!lessonWords && lessonWords.length > 0;
  const needsRecord = isClassroomMode && !hasLocal;
  const [record, setRecord] = useState<{ status: 'loading' | 'ready' | 'error'; words: string[] }>({ status: 'loading', words: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needsRecord) return;
    let cancelled = false;
    setRecord({ status: 'loading', words: [] });
    fetchLessonWords(gameCode).then(
      (words) => !cancelled && setRecord({ status: 'ready', words }),
      () => !cancelled && setRecord({ status: 'error', words: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [needsRecord, gameCode, attempt]);

  useEffect(() => {
    if (!socket) return;
    if (roomLanguage === 'ja') return;
    const words = hasLocal ? lessonWords! : needsRecord ? (record.status === 'ready' ? record.words : null) : [];
    if (words === null) return;
    if (words.length > 0) {
      setWordsForBoard(words.map((w) => w.toUpperCase()));
      return;
    }
    const { rows, cols } = DIFFICULTIES[difficulty];
    socket.emit('getWordsForBoard', { language: roomLanguage, boardSize: { rows, cols } });
  }, [socket, roomLanguage, difficulty, hasLocal, lessonWords, needsRecord, record, setWordsForBoard]);

  const retryLessonWords = useCallback(() => setAttempt((n) => n + 1), []);
  const lessonWordsStatus: LessonWordsStatus = hasLocal ? 'local' : needsRecord ? record.status : 'none';
  const blocksStart = needsRecord && roomLanguage !== 'ja' && record.status !== 'ready';

  return { lessonWordsStatus, blocksStart, retryLessonWords };
}
