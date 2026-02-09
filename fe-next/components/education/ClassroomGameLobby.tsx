/**
 * ClassroomGameLobby - Wizard Version
 *
 * Simplified 2-step wizard for creating classroom games:
 * Step 1: Select classroom & lessons
 * Step 2: Review, share code, and start
 *
 * Features:
 * - Streamlined flow (2 steps instead of 5 cards)
 * - Smart defaults for settings
 * - Collapsed advanced options
 * - Clear progress indication
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import logger from '@/utils/logger';
import { Play, Users, Copy, Check, BookOpen, School, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/components/ui/WizardStep';
import { MultiLessonSelector } from './MultiLessonSelector';
import { getLessons, getClassrooms, type VocabularyLesson, type Classroom } from '@/lib/supabase/teacher';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';

export interface ClassroomGameLobbyProps {
  /** Initial lesson ID to pre-select (optional) */
  initialLessonId?: string;
  /** Callback when user wants to go back */
  onBack: () => void;
}

export function ClassroomGameLobby({ initialLessonId, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';

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
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

      if (lessonsResult.data) {
        setLessons(lessonsResult.data);
      }

      if (classroomsResult.data) {
        setClassrooms(classroomsResult.data);
        // Auto-select first classroom
        if (classroomsResult.data.length > 0 && !selectedClassroomId) {
          setSelectedClassroomId(classroomsResult.data[0].id);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch teacher data:', error);
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
    fetchTeacherData();
  }, [user, language, router, fetchTeacherData]);

  // Initialize Socket.IO
  // Use shared socket URL to ensure production compatibility
  // (production uses NEXT_PUBLIC_WS_URL, not /api/socket)
  useEffect(() => {
    const socketUrl = getSocketURL();
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      logger.info('Connected to Socket.IO');
    });

    socketInstance.on('classroomGameCreated', (data: { success: boolean; gameCode: string }) => {
      if (data.success) {
        toast.success(t('education.classroomGame.gameCreated'));
        // Navigate to multiplayer (only time we leave education section)
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

  // Generate game code on mount
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

  // Get all playable words
  const allPlayableWords = useMemo(() => {
    const words = selectedLessons.flatMap((lesson) =>
      lesson.words?.filter((w) => w.canIntegrate).map((w) => w.word) || []
    );
    return [...new Set(words)];
  }, [selectedLessons]);

  // Copy game code
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

  // Start the game
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

  // Board size labels
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="progressbar">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan"></div>
      </div>
    );
  }

  // No classrooms error
  if (classrooms.length === 0) {
    return (
      <div className="p-8 rounded-neo border-neo border-neo-black bg-neo-navy/80 shadow-hard text-center">
        <p className="text-neo-white/70 font-neo-body mb-4">
          {t('education.classroomGame.noClassrooms')}
        </p>
        <button
          onClick={onBack}
          className={cn(
            'px-6 py-3 font-bold',
            'bg-neo-cyan text-neo-black',
            'border-neo border-neo-black rounded-neo shadow-hard',
            'hover:shadow-hard-lg transition-all'
          )}
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  // Step 1: Select Classroom & Lessons
  if (currentStep === 1) {
    return (
      <WizardStep
        currentStep={1}
        totalSteps={2}
        title={t('education.classroomGame.selectClassroomAndLessons')}
        description={t('education.classroomGame.selectClassroomAndLessonsDesc')}
        onNext={() => setCurrentStep(2)}
        onBack={onBack}
        nextDisabled={selectedLessonIds.length === 0}
      >
        <div className="space-y-6">
          {/* Classroom Selection */}
          <div>
            <label className="block text-neo-white font-bold mb-3">
              <School className="w-5 h-5 inline mr-2 text-neo-cyan" />
              {t('education.classroomGame.selectClassroom')}
            </label>
            <div className="space-y-2">
              {classrooms.map((classroom) => (
                <label
                  key={classroom.id}
                  className={cn(
                    'flex items-center p-4 rounded-neo border-neo border-neo-black',
                    'cursor-pointer transition-all',
                    selectedClassroomId === classroom.id
                      ? 'bg-neo-cyan/20 shadow-hard'
                      : 'bg-neo-navy/50 hover:bg-neo-navy'
                  )}
                >
                  <input
                    type="radio"
                    name="classroom"
                    value={classroom.id}
                    checked={selectedClassroomId === classroom.id}
                    onChange={() => setSelectedClassroomId(classroom.id)}
                    className="w-5 h-5 text-neo-cyan focus:ring-neo-cyan"
                    aria-label={`Class ${classroom.name}`}
                  />
                  <span className="ml-3 text-neo-white font-bold flex-1">
                    {classroom.name}
                  </span>
                  <span className="text-neo-white/70 text-sm">
                    {classroom.member_count || 0} {t('education.students')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Lesson Selection */}
          <div>
            <label className="block text-neo-white font-bold mb-3">
              <BookOpen className="w-5 h-5 inline mr-2 text-neo-pink" />
              {t('education.classroomGame.selectLessons')}
            </label>
            <MultiLessonSelector
              lessons={lessons}
              selectedLessonIds={selectedLessonIds}
              onSelectChange={setSelectedLessonIds}
            />

            {/* Word count */}
            {selectedLessonIds.length > 0 && (
              <div className="mt-4 p-3 bg-neo-cyan/10 rounded-neo border border-neo-cyan/30">
                <p className="text-neo-white font-bold text-center">
                  {allPlayableWords.length} {t('education.classroomGame.words')}
                </p>
              </div>
            )}
          </div>
        </div>
      </WizardStep>
    );
  }

  // Step 2: Review & Start
  return (
    <WizardStep
      currentStep={2}
      totalSteps={2}
      title={t('education.classroomGame.reviewAndStart')}
      description={t('education.classroomGame.shareCodeWithStudents')}
      onNext={handleStartGame}
      onBack={() => setCurrentStep(1)}
      nextLabel={t('education.classroomGame.startGame')}
      isLoading={isStarting}
    >
      <div className="space-y-6">
        {/* Game Code */}
        <div className="p-6 rounded-neo border-neo border-neo-cyan bg-neo-cyan/20 shadow-hard-lg">
          <p className="text-sm text-neo-white/70 font-neo-body mb-2 text-center">
            {t('education.classroomGame.shareCode')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-5xl font-black text-neo-cyan tracking-widest font-mono">
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
          <div className="flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-neo border-neo border-neo-black bg-neo-navy/50">
            <Users className="w-5 h-5 text-neo-cyan" />
            <span className="text-neo-white font-bold text-sm">
              {t('education.classroomGame.waitingForPlayers')}
            </span>
          </div>
        </div>

        {/* Smart Defaults Summary */}
        <div className="p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50">
          <h4 className="text-neo-white font-bold mb-3">
            {t('education.classroomGame.gameSettings')}
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-neo-white/50 text-xs mb-1">{t('education.template.timer')}</p>
              <p className="text-neo-white font-bold">{settings.timerMinutes} {t('common.minutes')}</p>
            </div>
            <div>
              <p className="text-neo-white/50 text-xs mb-1">{t('education.template.boardSize')}</p>
              <p className="text-neo-white font-bold">{getBoardSizeLabel(settings.boardSize)}</p>
            </div>
            <div>
              <p className="text-neo-white/50 text-xs mb-1">{t('education.template.lateJoin')}</p>
              <p className="text-neo-white font-bold">{settings.allowLateJoin ? '✓' : '✗'}</p>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'w-full mt-4 px-4 py-2 rounded-neo',
              'border-neo border-neo-black bg-neo-navy/30',
              'text-neo-white font-bold text-sm',
              'hover:bg-neo-navy transition-all',
              'flex items-center justify-center gap-2'
            )}
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('common.hideAdvanced')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('common.showAdvanced')}
              </>
            )}
          </button>

          {/* Advanced Settings (Collapsed) */}
          {showAdvanced && (
            <div className="mt-4 space-y-4 pt-4 border-t border-neo-white/10">
              {/* Timer */}
              <div>
                <label className="block text-sm text-neo-white/70 mb-2">
                  {t('education.template.timer')}
                </label>
                <select
                  value={settings.timerMinutes}
                  onChange={(e) => setSettings({ ...settings, timerMinutes: Number(e.target.value) })}
                  className={cn(
                    'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                    'text-neo-white font-neo-body shadow-hard-sm rounded-neo',
                    'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
                  )}
                  role="combobox"
                >
                  <option value={2}>2 {t('common.minutes')}</option>
                  <option value={3}>3 {t('common.minutes')}</option>
                  <option value={5}>5 {t('common.minutes')}</option>
                  <option value={10}>10 {t('common.minutes')}</option>
                </select>
              </div>

              {/* Board Size */}
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

              {/* Late Join */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neo-white font-bold text-sm">
                    {t('education.template.allowLateJoin')}
                  </p>
                  <p className="text-xs text-neo-white/50">
                    {t('education.template.allowLateJoinDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowLateJoin}
                  onChange={(e) => setSettings({ ...settings, allowLateJoin: e.target.checked })}
                  className="w-6 h-6 text-neo-cyan focus:ring-neo-cyan rounded"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </WizardStep>
  );
}
