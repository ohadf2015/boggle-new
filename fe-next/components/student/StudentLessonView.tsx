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
import { BookOpen, Clock, TrendingUp, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentLessonView() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const { progress, isLoading, error } = useStudentProgress();

  const [sortBy, setSortBy] = useState<'dueDate' | 'progress' | 'recent'>('recent');

  // Sort lessons based on selected criteria
  const sortedLessons = useMemo(() => {
    const lessons = [...progress];

    switch (sortBy) {
      case 'dueDate':
        // Sort by due date (if assignment exists), then by started_at
        return lessons.sort((a, b) => {
          // For now, we don't have due dates in the progress table
          // Just sort by started_at as a fallback
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
        });

      case 'progress':
        // Sort by mastery percentage (descending)
        return lessons.sort((a, b) => {
          const aTotal = Object.keys(a.words_attempted || {}).length || 1;
          const aMastered = (a.words_mastered || []).length;
          const aPercent = (aMastered / aTotal) * 100;

          const bTotal = Object.keys(b.words_attempted || {}).length || 1;
          const bMastered = (b.words_mastered || []).length;
          const bPercent = (bMastered / bTotal) * 100;

          return bPercent - aPercent;
        });

      case 'recent':
      default:
        // Sort by started_at (most recent first)
        return lessons.sort((a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
    }
  }, [progress, sortBy]);

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
      <div className="text-center py-16">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-neo-white/30" />
        <h3 className="text-xl font-neo-display text-neo-white mb-2">
          {t('student.lessons.empty.title')}
        </h3>
        <p className="text-neo-white/70 font-neo-body">
          {t('student.lessons.empty.subtitle')}
        </p>
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
        {sortedLessons.map((lessonProgress) => {
          const totalWords = Object.keys(lessonProgress.words_attempted || {}).length || 1;
          const masteredWords = (lessonProgress.words_mastered || []).length;
          const masteryPercent = Math.round((masteredWords / totalWords) * 100);
          const isCompleted = lessonProgress.completed_at !== null;

          return (
            <Card
              key={lessonProgress.id}
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
                      {t('student.lessons.lesson')} #{lessonProgress.lesson_id.slice(0, 6)}
                    </h3>
                    <p className="text-sm text-neo-white/60 font-neo-body flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(lessonProgress.started_at), { addSuffix: true })}
                    </p>
                  </div>

                  {isCompleted && (
                    <Award className="w-6 h-6 text-neo-yellow" />
                  )}
                </div>

                {/* Progress Stats */}
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
                        isCompleted ? 'bg-neo-yellow' : 'bg-neo-cyan'
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

                {/* Practice Button */}
                <Button
                  onClick={() => router.push(`/${language}/student/lessons/${lessonProgress.lesson_id}`)}
                  className={cn(
                    'w-full font-neo-display text-base',
                    'bg-neo-pink hover:bg-neo-pink/90',
                    'text-neo-white shadow-hard hover:shadow-hard-sm',
                    'transition-all'
                  )}
                >
                  {isCompleted ? t('student.lessons.review') : t('student.lessons.practice')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
