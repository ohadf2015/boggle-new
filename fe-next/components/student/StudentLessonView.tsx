/**
 * StudentLessonView Component
 *
 * Displays assigned vocabulary lessons with progress tracking and practice buttons
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, TrendingUp, Award, Gamepad2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentLessonView() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const { lessons, isLoading, error } = useStudentProgress();

  const [sortBy, setSortBy] = useState<'dueDate' | 'progress' | 'recent'>('recent');

  // Start a multiplayer game with lesson vocabulary (mirrors teacher LessonBuilder pattern)
  const handleStartGame = (studentLesson: typeof lessons[0]) => {
    const lesson = studentLesson.lesson;
    if (!lesson) return;

    // Get vocabulary words that can be integrated into the game board
    const vocabularyWords = (lesson.words || [])
      .filter((w) => w.canIntegrate)
      .map((w) => w.word);

    // Store lesson info in sessionStorage for the multiplayer page to use
    sessionStorage.setItem('lessonGameData', JSON.stringify({
      lessonId: studentLesson.lessonId,
      lessonName: lesson.name || 'Practice Game',
      vocabularyWords,
      language: lesson.language || language,
    }));

    // Navigate to multiplayer with lesson flag
    router.push(`/${language}/multiplayer?fromLesson=true`);
  };

  // Check if a lesson has vocabulary words that can be used in a game
  const hasPlayableWords = (studentLesson: typeof lessons[0]) => {
    const lesson = studentLesson.lesson;
    if (!lesson?.words) return false;
    return lesson.words.some((w) => w.canIntegrate);
  };

  // Sort lessons based on selected criteria
  const sortedLessons = useMemo(() => {
    const lessonsCopy = [...lessons];

    switch (sortBy) {
      case 'dueDate':
        // Sort by due date (if assignment exists), then by assigned/started date
        return lessonsCopy.sort((a, b) => {
          const aDate = a.dueDate || a.assignedAt || a.progress?.started_at || '';
          const bDate = b.dueDate || b.assignedAt || b.progress?.started_at || '';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

      case 'progress':
        // Sort by mastery percentage (descending)
        return lessonsCopy.sort((a, b) => {
          const aProgress = a.progress;
          const bProgress = b.progress;

          if (!aProgress) return 1; // No progress, push to end
          if (!bProgress) return -1; // No progress, push to end

          const aTotal = Object.keys(aProgress.words_attempted || {}).length || 1;
          const aMastered = (aProgress.words_mastered || []).length;
          const aPercent = (aMastered / aTotal) * 100;

          const bTotal = Object.keys(bProgress.words_attempted || {}).length || 1;
          const bMastered = (bProgress.words_mastered || []).length;
          const bPercent = (bMastered / bTotal) * 100;

          return bPercent - aPercent;
        });

      case 'recent':
      default:
        // Already sorted by status in hook (assigned, started, completed)
        return lessonsCopy;
    }
  }, [lessons, sortBy]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-neo-pink font-neo-body text-lg">{error}</p>
      </div>
    );
  }

  if (sortedLessons.length === 0) {
    return (
      <div className="text-center py-16 space-y-6">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-neo-white/30" />
        <div>
          <h3 className="text-xl font-neo-display text-neo-white mb-2">
            {t('student.lessons.empty.title')}
          </h3>
          <p className="text-neo-white/70 font-neo-body mb-4">
            {t('student.lessons.empty.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => router.push(`/${language}/student/join`)}
          className={cn(
            'font-neo-display text-base',
            'bg-neo-cyan hover:bg-neo-cyan/90',
            'text-neo-black shadow-hard hover:shadow-hard-sm',
            'transition-all'
          )}
        >
          {t('student.lessons.empty.joinClassroom')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setSortBy('recent')}
          variant={sortBy === 'recent' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'font-neo-body',
            sortBy === 'recent' && 'bg-neo-cyan text-neo-black shadow-hard'
          )}
        >
          {t('student.lessons.sort.recent')}
        </Button>
        <Button
          onClick={() => setSortBy('progress')}
          variant={sortBy === 'progress' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'font-neo-body',
            sortBy === 'progress' && 'bg-neo-cyan text-neo-black shadow-hard'
          )}
        >
          {t('student.lessons.sort.progress')}
        </Button>
      </div>

      {/* Lesson Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedLessons.map((studentLesson) => {
          const { status, lesson, progress, assignment } = studentLesson;

          // Calculate progress stats
          const lessonWords = lesson?.words || [];
          const totalWords = lessonWords.length || 1;
          const masteredWords = (progress?.words_mastered || []).length;
          const masteryPercent = progress
            ? Math.round((masteredWords / totalWords) * 100)
            : 0;

          // Get lesson name
          const lessonName = lesson?.name || `${t('student.lessons.lesson')} #${studentLesson.lessonId.slice(0, 6)}`;

          // Get date for display
          const displayDate = status === 'assigned'
            ? assignment?.created_at
            : progress?.started_at;

          return (
            <Card
              key={studentLesson.lessonId}
              className={cn(
                'bg-neo-navy border-neo border-neo-black shadow-hard hover:shadow-hard-lg',
                'transition-all duration-200',
                'overflow-hidden'
              )}
            >
              <CardContent className="p-6 space-y-4">
                {/* Lesson Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-neo-display text-neo-white mb-1">
                      {lessonName}
                    </h3>
                    <p className="text-sm text-neo-white/60 font-neo-body flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {displayDate && formatDistanceToNow(new Date(displayDate), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {status === 'assigned' && (
                    <span className="px-2 py-1 bg-neo-cyan text-neo-black text-xs font-neo-display font-bold rounded-neo">
                      {t('student.lessons.new')}
                    </span>
                  )}
                  {status === 'completed' && (
                    <Award className="w-6 h-6 text-neo-yellow" />
                  )}
                </div>

                {/* Progress Stats - only show for started/completed */}
                {status !== 'assigned' && progress && (
                  <div className="space-y-2">
                    {/* Word Count */}
                    <div className="flex items-center justify-between text-sm font-neo-body">
                      <span className="text-neo-white/70">{t('student.lessons.words')}</span>
                      <span className="text-neo-white font-bold">{totalWords}</span>
                    </div>

                    {/* Mastered Count */}
                    <div className="flex items-center justify-between text-sm font-neo-body">
                      <span className="text-neo-white/70">{t('student.lessons.mastered')}</span>
                      <span className="text-neo-cyan font-bold">
                        {masteredWords} / {totalWords}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-4 bg-neo-black border-2 border-neo-black overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          status === 'completed' ? 'bg-neo-yellow' : 'bg-neo-cyan'
                        )}
                        style={{ width: `${masteryPercent}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-neo-body font-bold text-neo-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {masteryPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned lesson info */}
                {status === 'assigned' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-neo-body">
                      <span className="text-neo-white/70">{t('student.lessons.words')}</span>
                      <span className="text-neo-white font-bold">{totalWords}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => router.push(`/${language}/student/lessons/${studentLesson.lessonId}`)}
                    className={cn(
                      'flex-1 font-neo-display text-base',
                      status === 'assigned'
                        ? 'bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black'
                        : 'bg-neo-pink hover:bg-neo-pink/90 text-neo-white',
                      'shadow-hard hover:shadow-hard-sm',
                      'transition-all'
                    )}
                  >
                    {status === 'assigned' && t('student.lessons.start')}
                    {status === 'started' && t('student.lessons.continue')}
                    {status === 'completed' && t('student.lessons.review')}
                  </Button>

                  {/* Play Game button - only show if lesson has playable vocabulary */}
                  {hasPlayableWords(studentLesson) && (
                    <Button
                      onClick={() => handleStartGame(studentLesson)}
                      variant="outline"
                      className={cn(
                        'font-neo-display text-base',
                        'border-neo-yellow text-neo-yellow hover:bg-neo-yellow/20',
                        'shadow-hard hover:shadow-hard-sm',
                        'transition-all'
                      )}
                      title={t('student.lessons.playGameHint')}
                    >
                      <Gamepad2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
