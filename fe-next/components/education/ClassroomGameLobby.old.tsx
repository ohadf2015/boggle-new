'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Users, Clock, BookOpen, ArrowLeft, Share2, Copy, Check, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VocabularyLesson } from '@/lib/supabase/teacher';
import toast from 'react-hot-toast';

export interface ClassroomGameLobbyProps {
  /** The lesson to use for the game */
  lesson: VocabularyLesson;
  /** Callback when user wants to go back */
  onBack: () => void;
}

/**
 * ClassroomGameLobby - Education-specific game lobby
 *
 * Creates a classroom-branded lobby for vocabulary games:
 * - Shows lesson name and vocabulary words
 * - Displays game settings
 * - Generates shareable game code
 * - Starts game with lesson vocabulary
 *
 * Neo-brutalist styling with hard shadows and chunky borders.
 */
export function ClassroomGameLobby({ lesson, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';

  const [gameCode, setGameCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Game settings state
  const [settings, setSettings] = useState({
    timerMinutes: 3,
    boardSize: 'medium' as 'small' | 'medium' | 'large',
    allowLateJoin: true,
  });

  // Generate a random game code on mount
  useEffect(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGameCode(code);
  }, []);

  // Get playable vocabulary words (memoized to prevent re-renders)
  const playableWords = useMemo(
    () => lesson.words?.filter((w) => w.canIntegrate) || [],
    [lesson.words]
  );
  const totalWords = lesson.words?.length || 0;

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

  // Start the game
  const handleStartGame = useCallback(() => {
    setIsStarting(true);

    // Store lesson data for the game
    sessionStorage.setItem('lessonGameData', JSON.stringify({
      lessonId: lesson.id,
      lessonName: lesson.name,
      vocabularyWords: playableWords.map((w) => w.word),
      language: lesson.language,
      isClassroomGame: true,
      templateSettings: {
        timerSeconds: settings.timerMinutes * 60,
        difficulty: settings.boardSize,
        allowLateJoin: settings.allowLateJoin,
      },
    }));

    // Navigate to multiplayer with classroom game flag
    router.push(`/${language}/multiplayer?fromLesson=true&classroom=true&code=${gameCode}`);
  }, [lesson, playableWords, settings, gameCode, language, router]);

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

  return (
    <div className="space-y-6">
      {/* Header with lesson info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-neo-display text-neo-white mb-2">
            {t('education.classroomGame.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {lesson.name}
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

      {/* Settings and Words Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Vocabulary Words */}
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-neo-white font-neo-display">
              <span className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-neo-pink" />
                {t('education.classroomGame.vocabularyWords')}
              </span>
              <span className="text-sm font-normal text-neo-white/70">
                {playableWords.length}/{totalWords} {t('education.classroomGame.playable')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playableWords.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {playableWords.map((word, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'px-3 py-1 text-sm font-bold',
                      'bg-neo-pink/20 text-neo-pink',
                      'rounded-neo border border-neo-pink/50'
                    )}
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-neo-white/50 text-center py-4">
                {t('education.classroomGame.noPlayableWords')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Start Game Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleStartGame}
          disabled={isStarting || playableWords.length === 0}
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

export default ClassroomGameLobby;
