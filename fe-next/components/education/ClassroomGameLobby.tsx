/**
 * ClassroomGameLobby - Wizard Version
 *
 * Simplified 2-step wizard for creating classroom games:
 * Step 1: Select classroom & lessons
 * Step 2: Review, share code, and start
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import logger from '@/utils/logger';
import { BookOpen, School } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getLessons, getClassrooms, type VocabularyLesson, type Classroom } from '@/lib/supabase/education';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassroomSetupStep } from './ClassroomSetupStep';
import { ClassroomReviewStep } from './ClassroomReviewStep';

export interface ClassroomGameLobbyProps {
  initialLessonId?: string;
  onBack: () => void;
}

export function ClassroomGameLobby({ initialLessonId, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Data state
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(
    initialLessonId ? [initialLessonId] : []
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [gameCode, setGameCode] = useState<string>('');
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Game mode selection
  const [gameMode, setGameMode] = useState<'classic' | 'wordHunt' | 'blast'>('classic');

  // Game settings with smart defaults
  const [settings, setSettings] = useState({
    timerMinutes: 3,
    boardSize: 'medium' as 'small' | 'medium' | 'large',
    allowLateJoin: true,
  });

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
          router.push(`/${language}/multiplayer?code=${data.gameCode}&classroom=true`);
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

  // Build SSR-safe join URL
  useEffect(() => {
    if (gameCode && typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/join?code=${gameCode}`);
    }
  }, [gameCode]);

  const selectedLessons = useMemo(() => {
    return lessons.filter((l) => selectedLessonIds.includes(l.id));
  }, [lessons, selectedLessonIds]);

  const allPlayableWords = useMemo(() => {
    const words = selectedLessons.flatMap((lesson) =>
      lesson.words?.filter((w) => w.canIntegrate).map((w) => w.word) || []
    );
    return [...new Set(words)];
  }, [selectedLessons]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      toast.success(t('share.codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('share.codeCopyError'));
    }
  }, [gameCode, t]);

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
      templateSettings: {
        timerSeconds: settings.timerMinutes * 60,
        difficulty: settings.boardSize,
        minWordLength: 3,
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
      },
    });
  }, [
    user, socket, selectedLessonIds, selectedClassroomId, gameCode,
    classrooms, selectedLessons, allPlayableWords, settings, gameMode, profile, language, t,
  ]);

  if (isLoading) {
    return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
  }

  // No classrooms
  if (classrooms.length === 0) {
    return (
      <div className="p-8 rounded-neo border-neo border-neo-black bg-neo-navy/80 shadow-hard text-center">
        <School className="w-12 h-12 text-neo-white/30 mx-auto mb-4" />
        <p className="text-neo-white/70 font-neo-body mb-4">
          {t('education.classroomGame.noClassrooms')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onBack} className={cn('px-6 py-3 font-bold bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all')}>
            {t('common.back')}
          </button>
          <button onClick={() => router.push(`/${language}/teacher`)} className={cn('px-6 py-3 font-bold bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all')}>
            {t('education.classroomGame.createClassroom')}
          </button>
        </div>
      </div>
    );
  }

  // No lessons
  if (lessons.length === 0) {
    return (
      <div className="p-8 rounded-neo border-neo border-neo-black bg-neo-navy/80 shadow-hard text-center">
        <BookOpen className="w-12 h-12 text-neo-white/30 mx-auto mb-4" />
        <p className="text-neo-white/70 font-neo-body mb-4">
          {t('education.classroomGame.noLessonsAvailable')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onBack} className={cn('px-6 py-3 font-bold bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all')}>
            {t('common.back')}
          </button>
          <button onClick={() => router.push(`/${language}/teacher`)} className={cn('px-6 py-3 font-bold bg-neo-pink text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all')}>
            {t('education.classroomGame.createLesson')}
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <ClassroomSetupStep
        classrooms={classrooms}
        lessons={lessons}
        selectedClassroomId={selectedClassroomId}
        selectedLessonIds={selectedLessonIds}
        allPlayableWords={allPlayableWords}
        onSelectClassroom={setSelectedClassroomId}
        onSelectLessons={setSelectedLessonIds}
        onNext={() => setCurrentStep(2)}
        onBack={onBack}
      />
    );
  }

  return (
    <ClassroomReviewStep
      gameCode={gameCode}
      joinUrl={joinUrl}
      copied={copied}
      isStarting={isStarting}
      settings={settings}
      showAdvanced={showAdvanced}
      gameMode={gameMode}
      onGameModeChange={setGameMode}
      onCopyCode={handleCopyCode}
      onStartGame={handleStartGame}
      onBack={() => setCurrentStep(1)}
      onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      onSettingsChange={setSettings}
    />
  );
}
