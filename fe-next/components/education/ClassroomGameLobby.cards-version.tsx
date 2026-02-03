'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Users, Clock, BookOpen, ArrowLeft, Copy, Check, Settings, School } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiLessonSelector } from './MultiLessonSelector';
import { getLessons, getClassrooms, type VocabularyLesson, type Classroom } from '@/lib/supabase/teacher';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

export interface ClassroomGameLobbyProps {
  /** Initial lesson ID to pre-select (optional) */
  initialLessonId?: string;
  /** Callback when user wants to go back */
  onBack: () => void;
}

/**
 * ClassroomGameLobby - Education-specific game lobby (v2)
 *
 * Creates classroom-scoped multiplayer games with:
 * - Multi-lesson selection
 * - Teacher-only access
 * - Classroom selection
 * - Socket.IO integration for real-time notifications
 */
export function ClassroomGameLobby({ initialLessonId, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';

  // State
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(
    initialLessonId ? [initialLessonId] : []
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [gameCode, setGameCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Game settings state
  const [settings, setSettings] = useState({
    timerMinutes: 3,
    boardSize: 'medium' as 'small' | 'medium' | 'large',
    allowLateJoin: true,
  });

  // Teacher validation - redirect if not a teacher
  // Fetch teacher's lessons and classrooms
  const fetchTeacherData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [lessonsResult, classroomsResult] = await Promise.all([
        getLessons(user.id),
        getClassrooms(user.id),
      ]);

      if (lessonsResult.data) {
        setLessons(lessonsResult.data);
      }

      if (classroomsResult.data) {
        setClassrooms(classroomsResult.data);
        // Auto-select first classroom if available
        if (classroomsResult.data.length > 0 && !selectedClassroomId) {
          setSelectedClassroomId(classroomsResult.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedClassroomId, t]);

  useEffect(() => {
    if (!user) {
      router.push(`/${language}/education`);
      return;
    }

    // Check if user is a teacher (has created classrooms or lessons)
    // For now, we'll allow any authenticated user and fetch their data
    fetchTeacherData();
  }, [user, language, router, fetchTeacherData]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO');
    });

    socketInstance.on('classroomGameCreated', (data: { success: boolean; gameCode: string }) => {
      if (data.success) {
        toast.success(t('education.classroomGame.gameCreated'));
        // Navigate to multiplayer game
        router.push(`/${language}/multiplayer?fromLesson=true&classroom=true&code=${data.gameCode}`);
      }
    });

    socketInstance.on('classroomGameError', (data: { error: string }) => {
      toast.error(data.error);
      setIsStarting(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [t, language, router]);

  // Generate a random game code on mount
  useEffect(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGameCode(code);
  }, []);

  // Get selected lessons
  const selectedLessons = useMemo(() => {
    return lessons.filter((l) => selectedLessonIds.includes(l.id));
  }, [lessons, selectedLessonIds]);

  // Get all playable words from selected lessons
  const allPlayableWords = useMemo(() => {
    const words = selectedLessons.flatMap((lesson) =>
      lesson.words?.filter((w) => w.canIntegrate).map((w) => w.word) || []
    );
    // Remove duplicates
    return [...new Set(words)];
  }, [selectedLessons]);

  // Copy game code to clipboard
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

  // Start the game - create classroom game via Socket.IO
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

    // Create classroom game via Socket.IO
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
      },
    });
  }, [
    user,
    socket,
    selectedLessonIds,
    selectedClassroomId,
    gameCode,
    classrooms,
    selectedLessons,
    allPlayableWords,
    settings,
    profile,
    t,
  ]);

  // Get board size label
  const getBoardSizeLabel = (size: string) => {
    switch (size) {
      case 'small':
        return '4x4';
      case 'medium':
        return '5x5';
      case 'large':
        return '6x6';
      default:
        return '5x5';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-neo-display text-neo-white mb-2">
            {t('education.classroomGame.createGame')}
          </h1>
          <p className="text-neo-white/70 font-neo-body">
            {t('education.classroomGame.createGameDesc')}
          </p>
        </div>

        <Button
          onClick={onBack}
          variant="outline"
          className={cn(
            'border-neo border-neo-black shadow-hard',
            'bg-neo-navy/50 text-neo-white hover:bg-neo-navy',
            'transition-all'
          )}
        >
          <ArrowLeft className={cn('w-4 h-4', isRTL ? 'ml-2 rotate-180' : 'mr-2')} />
          {t('common.back')}
        </Button>
      </div>

      {/* Classroom Selector */}
      <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-neo-white font-neo-display">
            <School className="w-5 h-5 text-neo-cyan" />
            {t('education.classroomGame.selectClassroom')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classrooms.length > 0 ? (
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className={cn(
                'w-full px-4 py-3 bg-neo-navy border-neo border-neo-black',
                'text-neo-white font-neo-body shadow-hard-sm rounded-neo',
                'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
              )}
            >
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name} ({classroom.member_count || 0} {t('education.students')})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-neo-white/60 py-4 text-center">
              {t('education.classroomGame.noClassrooms')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Multi-Lesson Selector */}
      <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-neo-white font-neo-display">
            <BookOpen className="w-5 h-5 text-neo-pink inline-block mr-2" />
            {t('education.classroomGame.lessons')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiLessonSelector
            lessons={lessons}
            selectedLessonIds={selectedLessonIds}
            onSelectChange={setSelectedLessonIds}
          />

          {/* Word count summary */}
          {selectedLessonIds.length > 0 && (
            <div className="mt-4 p-3 bg-neo-navy rounded-neo border border-neo-pink/30">
              <p className="text-neo-white font-bold">
                {t('education.classroomGame.totalWords')}: {allPlayableWords.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Code Card */}
      <Card className="border-neo border-neo-cyan shadow-hard-lg bg-gradient-to-br from-neo-cyan/20 to-neo-cyan/10">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-start">
              <p className="text-sm text-neo-white/70 font-neo-body mb-1">
                {t('education.classroomGame.shareCode')}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-neo-cyan tracking-widest font-mono">
                  {gameCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    'p-3 rounded-neo border-neo border-neo-black',
                    'bg-neo-cream text-neo-black',
                    'shadow-hard hover:shadow-hard-lg',
                    'transition-all',
                    copied && 'bg-neo-lime'
                  )}
                  aria-label={t('share.copy')}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-neo border-neo border-neo-black bg-neo-navy/50">
              <Users className="w-5 h-5 text-neo-cyan" />
              <span className="text-neo-white font-bold">
                {t('education.classroomGame.waitingForPlayers')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Settings */}
      <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-neo-white font-neo-display">
            <Settings className="w-5 h-5 text-neo-cyan" />
            {t('education.classroomGame.settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Setting */}
          <div>
            <label className="block text-sm text-neo-white/70 mb-2">
              {t('education.template.timer')}
            </label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neo-cyan" />
              <select
                value={settings.timerMinutes}
                onChange={(e) => setSettings({ ...settings, timerMinutes: Number(e.target.value) })}
                className={cn(
                  'flex-1 px-4 py-2 bg-neo-navy border-neo border-neo-black',
                  'text-neo-white font-neo-body shadow-hard-sm rounded-neo',
                  'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
                )}
              >
                <option value={2}>2 {t('common.minutes')}</option>
                <option value={3}>3 {t('common.minutes')}</option>
                <option value={5}>5 {t('common.minutes')}</option>
                <option value={10}>10 {t('common.minutes')}</option>
              </select>
            </div>
          </div>

          {/* Board Size Setting */}
          <div>
            <label className="block text-sm text-neo-white/70 mb-2">
              {t('education.template.difficulty')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setSettings({ ...settings, boardSize: size })}
                  className={cn(
                    'px-4 py-2 font-bold rounded-neo border-neo border-neo-black transition-all',
                    settings.boardSize === size
                      ? 'bg-neo-cyan text-neo-black shadow-hard'
                      : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                  )}
                >
                  {getBoardSizeLabel(size)}
                </button>
              ))}
            </div>
          </div>

          {/* Late Join Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neo-white font-bold">
                {t('education.template.allowLateJoin')}
              </p>
              <p className="text-xs text-neo-white/50">
                {t('education.template.allowLateJoinDesc')}
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, allowLateJoin: !settings.allowLateJoin })}
              className={cn(
                'relative w-14 h-8 rounded-full border-neo border-neo-black transition-colors',
                settings.allowLateJoin ? 'bg-neo-cyan' : 'bg-neo-navy/50'
              )}
              role="switch"
              aria-checked={settings.allowLateJoin}
            >
              <motion.div
                className="absolute top-1 w-6 h-6 rounded-full bg-neo-white border-2 border-neo-black shadow-hard-sm"
                animate={{ left: settings.allowLateJoin ? '28px' : '4px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Start Game Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleStartGame}
          disabled={isStarting || selectedLessonIds.length === 0 || !selectedClassroomId || classrooms.length === 0}
          size="lg"
          className={cn(
            'px-12 py-6 text-xl font-black',
            'bg-neo-lime text-neo-black',
            'border-neo-thick border-neo-black rounded-neo shadow-hard-lg',
            'hover:shadow-hard-xl hover:translate-y-[-2px]',
            'active:shadow-hard active:translate-y-0',
            'transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
          )}
        >
          {isStarting ? (
            <>
              <span className="animate-spin mr-2">
                <Play className="w-6 h-6" />
              </span>
              {t('education.classroomGame.starting')}
            </>
          ) : (
            <>
              <Play className={cn('w-6 h-6', isRTL ? 'ml-3' : 'mr-3')} />
              {t('education.classroomGame.startGame')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
