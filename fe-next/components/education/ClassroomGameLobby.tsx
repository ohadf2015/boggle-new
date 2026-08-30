/**
 * ClassroomGameLobby
 *
 * Single-step classroom game creator: teacher picks classroom + lessons + mode,
 * then clicking Start Game creates the room and enters the multiplayer lobby
 * where game code, QR, and education details are displayed.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import logger from '@/utils/logger';
import { BookOpen, School } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getLessons, getClassrooms, createLesson as createLessonAPI, type VocabularyLesson, type Classroom } from '@/lib/supabase/education';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassroomSetupStep } from './ClassroomSetupStep';
import { StarterPacksSection } from '@/components/teacher/StarterPacksSection';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';
import { classroomMultiplayerPath } from '@/lib/education/classroomGameHandoff';
import type { GameMode } from '@/shared/types/game';
import type { Language } from '@/lib/supabase/education/types';

export interface ClassroomGameLobbyProps {
  initialLessonId?: string;
  onBack: () => void;
}

export function ClassroomGameLobby({ initialLessonId, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(
    initialLessonId ? [initialLessonId] : []
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [gameCode, setGameCode] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  // Word Hunt only: the lesson word the teacher pinned as the hunted target.
  // '' means "let the game choose".
  const [targetWord, setTargetWord] = useState<string>('');
  // Shortest word that scores — the teacher's grade-level dial.
  const [minWordLength, setMinWordLength] = useState<number>(3);
  const [isCreatingFromPack, setIsCreatingFromPack] = useState(false);

  // Teacher-configurable lobby settings — were hardcoded, now part of the
  // wizard so the room is created with the teacher's final choices instead of
  // forcing them into the lobby with defaults they can't preview.
  const [timerMinutes, setTimerMinutes] = useState<number>(3);
  const [boardSize, setBoardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const settings = useMemo(
    () => ({ timerMinutes, boardSize, allowLateJoin: true }),
    [timerMinutes, boardSize]
  );

  // Fetch teacher data
  const fetchTeacherData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [lessonsResult, classroomsResult] = await Promise.all([
        getLessons(user.id),
        getClassrooms(user.id),
      ]);
      if (lessonsResult.data) setLessons(lessonsResult.data);
      if (classroomsResult.data) {
        setClassrooms(classroomsResult.data);
        if (classroomsResult.data.length > 0) {
          // Use functional update to avoid depending on selectedClassroomId,
          // which would create a re-fetch loop (fetch sets id → callback
          // recreated → effect re-runs → isLoading=true → fetch again).
          setSelectedClassroomId((prev) => prev || classroomsResult.data[0].id);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch teacher data:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!user) {
      router.push(`/${language}/education`);
      return;
    }
    fetchTeacherData();
  }, [user, language, router, fetchTeacherData]);

  // Initialize Socket.IO
  useEffect(() => {
    const socketUrl = getSocketURL();
    let socketInstance: ReturnType<typeof io>;

    async function initSocket() {
      let token: string | undefined;
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch {
        // proceed without token
      }

      socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
      });

      socketInstance.on('connect', () => { logger.info('Connected to Socket.IO'); });
      socketInstance.on('classroomGameCreated', (data: { success: boolean; gameCode: string }) => {
        if (data.success) {
          toast.success(t('education.classroomGame.gameCreated'));
          router.push(classroomMultiplayerPath(language, data.gameCode));
        }
      });
      socketInstance.on('classroomGameError', (data: { error: string }) => {
        toast.error(data.error);
        setIsStarting(false);
      });

      setSocket(socketInstance);
    }

    initSocket();
    return () => { socketInstance?.disconnect(); };
  }, [t, language, router]);

  // Generate game code on mount
  useEffect(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGameCode(code);
  }, []);

  const selectedLessons = useMemo(() => {
    return lessons.filter((l) => selectedLessonIds.includes(l.id));
  }, [lessons, selectedLessonIds]);

  const allPlayableWords = useMemo(() => {
    const words = selectedLessons.flatMap((lesson) =>
      lesson.words?.filter((w) => w.canIntegrate).map((w) => w.word) || []
    );
    return [...new Set(words)];
  }, [selectedLessons]);

  const handleSelectStarterPack = useCallback(
    async (pack: { name: string; description: string; language: string; words: any[] }) => {
      if (!user) {
        toast.error(t('errors.loadFailed'));
        return;
      }

      setIsCreatingFromPack(true);
      try {
        const vocabularyWords = convertPackWordsToLessonWords(pack.words);

        const { data: newLesson, error } = await createLessonAPI({
          teacher_id: user.id,
          classroom_id: null,
          name: pack.name,
          description: pack.description,
          language: pack.language as Language,
          words: vocabularyWords,
          is_public: false,
          source_game_code: null,
        });

        if (error || !newLesson) {
          logger.error('Failed to create lesson from starter pack:', error);
          toast.error(error?.message || t('education.lesson.creationFailed'));
          setIsCreatingFromPack(false);
          return;
        }

        // Add the new lesson to state and select it
        setLessons([newLesson, ...lessons]);
        setSelectedLessonIds([newLesson.id]);
        toast.success(t('education.lesson.created'));
        setIsCreatingFromPack(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Exception creating lesson from starter pack:', errorMsg);
        toast.error(t('education.lesson.creationFailed'));
        setIsCreatingFromPack(false);
      }
    },
    [user, t, lessons]
  );

  const handleStartGame = useCallback(() => {
    if (!user || !socket || selectedLessonIds.length === 0 || !selectedClassroomId) {
      toast.error(t('education.classroomGame.missingRequirements'));
      return;
    }
    setIsStarting(true);

    const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);
    if (!selectedClassroom) {
      toast.error(t('education.classroomGame.classroomNotFound'));
      setIsStarting(false);
      return;
    }

    sessionStorage.setItem('lessonGameData', JSON.stringify({
      lessonId: selectedLessonIds.join(','),
      lessonName: selectedLessons.map(l => l.name).join(', '),
      vocabularyWords: allPlayableWords,
      language,
      gameMode,
      targetWord,
      templateSettings: {
        timerSeconds: settings.timerMinutes * 60,
        difficulty: settings.boardSize,
        minWordLength,
        allowLateJoin: settings.allowLateJoin,
      },
    }));

    socket.emit('createClassroomGame', {
      gameCode,
      classroomId: selectedClassroomId,
      teacherId: user.id,
      teacherName: profile?.display_name || user.email || 'Teacher',
      lessonIds: selectedLessonIds,
      lessonNames: selectedLessons.map((l) => l.name),
      vocabularyWords: allPlayableWords,
      settings: {
        timerMinutes: settings.timerMinutes,
        boardSize: settings.boardSize,
        allowLateJoin: settings.allowLateJoin,
        gameMode,
        targetWord: targetWord || undefined,
      },
    });
  }, [
    user, socket, selectedLessonIds, selectedClassroomId, gameCode,
    classrooms, selectedLessons, allPlayableWords, settings, gameMode, targetWord, minWordLength, profile, language, t,
  ]);

  if (isLoading) {
    return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
  }

  // No classrooms
  if (classrooms.length === 0) {
    return (
      <div className="p-8 rounded-neo border-neo border-neo-black bg-neo-navy/80 shadow-hard text-center">
        <School className="w-12 h-12 text-neo-white mx-auto mb-4" />
        <p className="text-neo-white font-neo-body mb-4">
          {t('education.classroomGame.noClassrooms')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={onBack} className={cn('px-6 py-3 font-bold bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all')}>
            {t('common.back')}
          </button>
          <button type="button" onClick={() => router.push(`/${language}/teacher`)} className={cn('px-6 py-3 font-bold bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all')}>
            {t('education.classroomGame.createClassroom')}
          </button>
        </div>
      </div>
    );
  }

  // No lessons - show starter packs
  if (lessons.length === 0) {
    return (
      <div className="p-8 rounded-neo border-neo border-neo-black bg-neo-navy/80 shadow-hard">
        <div className="mb-6">
          <button
            type="button"
            onClick={onBack}
            className={cn('px-4 py-2 font-bold bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all text-sm')}
          >
            {t('common.back')}
          </button>
        </div>
        <div className={isCreatingFromPack ? 'opacity-50 pointer-events-none' : ''}>
          <StarterPacksSection onSelectPack={handleSelectStarterPack} />
        </div>
        {isCreatingFromPack && (
          <div className="mt-4 text-center">
            <PageLoader text={t('teacher.classroom.settingUp')} size="sm" nested />
          </div>
        )}
        <div className="mt-6 text-center">
          <p className="text-sm text-neo-white font-neo-body mb-3">
            {t('education.lesson.preferCustom')}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${language}/teacher`)}
            className={cn('px-6 py-3 font-bold bg-neo-pink text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all')}
          >
            {t('education.classroomGame.createLesson')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ClassroomSetupStep
      classrooms={classrooms}
      lessons={lessons}
      selectedClassroomId={selectedClassroomId}
      selectedLessonIds={selectedLessonIds}
      allPlayableWords={allPlayableWords}
      gameMode={gameMode}
      targetWord={targetWord}
      minWordLength={minWordLength}
      timerMinutes={timerMinutes}
      boardSize={boardSize}
      isStarting={isStarting}
      onSelectClassroom={setSelectedClassroomId}
      onSelectLessons={setSelectedLessonIds}
      onGameModeChange={setGameMode}
      onTargetWordChange={setTargetWord}
      onMinWordLengthChange={setMinWordLength}
      onTimerChange={setTimerMinutes}
      onBoardSizeChange={setBoardSize}
      onNext={handleStartGame}
      onBack={onBack}
    />
  );
}
