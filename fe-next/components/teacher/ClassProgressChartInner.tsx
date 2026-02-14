'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassProgress } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/PageLoader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users } from 'lucide-react';

// Neo-brutalist chart colors
const CHART_COLORS = {
  wordsLearned: '#00FFFF', // neo-cyan
  accuracy: '#FF1493', // neo-pink
  grid: '#333333',
  text: '#FFFFFF',
  tooltip: '#1a1a2e',
  tooltipBorder: '#00FFFF',
};

// Custom tooltip component (must be outside render)
const CustomTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="bg-neo-navy border-neo border-neo-cyan shadow-hard p-3 rounded-neo"
      style={{ backgroundColor: CHART_COLORS.tooltip, borderColor: CHART_COLORS.tooltipBorder }}
    >
      <p className="text-neo-white font-neo-body font-bold mb-2">{payload[0].payload.formattedDate}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.wordsLearned }} />
          <span className="text-neo-cyan text-sm">
            {t('teacher.progress.wordsLearned')}: {payload[0].value}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.accuracy }} />
          <span className="text-neo-pink text-sm">
            {t('teacher.progress.accuracy')}: {payload[1].value}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ClassProgressChart() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { classrooms, isLoading: loadingClassrooms } = useClassrooms();
  const { lessons, isLoading: loadingLessons } = useLessons();

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  const { progress, isLoading: loadingProgress } = useClassProgress(
    selectedClassroomId || undefined,
    selectedLessonId
  );

  // Transform progress data into time series for chart
  const chartData = useMemo(() => {
    if (progress.length === 0) return [];

    // Group progress by date
    const dateMap = new Map<string, { totalWords: number; totalCorrect: number; totalAttempts: number; count: number }>();

    progress.forEach((p) => {
      const date = new Date(p.started_at).toISOString().split('T')[0];
      const wordsAttempted = Object.keys(p.words_attempted || {}).length;
      const totalAttempts = Object.values(p.words_attempted || {}).reduce(
        (sum, attempt: any) => sum + attempt.attempts,
        0
      );
      const totalCorrect = Object.values(p.words_attempted || {}).reduce(
        (sum, attempt: any) => sum + attempt.correct,
        0
      );

      if (!dateMap.has(date)) {
        dateMap.set(date, { totalWords: 0, totalCorrect: 0, totalAttempts: 0, count: 0 });
      }

      const entry = dateMap.get(date)!;
      entry.totalWords += wordsAttempted;
      entry.totalCorrect += totalCorrect;
      entry.totalAttempts += totalAttempts;
      entry.count += 1;
    });

    // Convert to array and sort by date
    const data = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        wordsLearned: Math.round(stats.totalWords / stats.count),
        accuracy: stats.totalAttempts > 0 ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cumulative words learned
    let cumulative = 0;
    return data.map((entry) => {
      cumulative += entry.wordsLearned;
      return {
        ...entry,
        wordsLearned: cumulative,
        formattedDate: new Date(entry.date).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL', {
          month: 'short',
          day: 'numeric',
        }),
      };
    });
  }, [progress, language]);

  if (loadingClassrooms || loadingLessons) {
    return (
      <div className="flex justify-center items-center py-12">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-neo-body text-neo-white mb-2">
            {t('teacher.dashboard.classrooms')}
          </label>
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className={cn(
              'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
              'text-neo-white font-neo-body shadow-hard-sm',
              'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
            )}
          >
            <option value="">All Classrooms</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-neo-body text-neo-white mb-2">
            {t('teacher.dashboard.lessons')}
          </label>
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className={cn(
              'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
              'text-neo-white font-neo-body shadow-hard-sm',
              'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
            )}
          >
            <option value="">All Lessons</option>
            {lessons
              .filter((l) => !selectedClassroomId || l.classroom_id === selectedClassroomId)
              .map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      {!selectedClassroomId || !selectedLessonId ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 text-neo-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-neo-display text-neo-white mb-2">
              {t('teacher.progress.noData')}
            </h3>
            <p className="text-neo-white/60">{t('teacher.progress.assignLessons')}</p>
          </CardContent>
        </Card>
      ) : loadingProgress ? (
        <div className="flex justify-center items-center py-12">
          <PageLoader size="md" text={t('common.loading')} />
        </div>
      ) : chartData.length === 0 ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-neo-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-neo-display text-neo-white mb-2">
              {t('teacher.progress.noData')}
            </h3>
            <p className="text-neo-white/60">No progress data available for this lesson yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80">
          <CardHeader>
            <CardTitle className="text-2xl font-neo-display text-neo-white">
              {t('teacher.progress.chartTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="formattedDate"
                  stroke={CHART_COLORS.text}
                  style={{ fontSize: '12px', fontFamily: 'Rubik' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke={CHART_COLORS.wordsLearned}
                  style={{ fontSize: '12px', fontFamily: 'Rubik' }}
                  label={{
                    value: t('teacher.progress.wordsLearned'),
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: CHART_COLORS.wordsLearned, fontFamily: 'Rubik', fontSize: '14px' },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={CHART_COLORS.accuracy}
                  style={{ fontSize: '12px', fontFamily: 'Rubik' }}
                  label={{
                    value: t('teacher.progress.accuracy'),
                    angle: 90,
                    position: 'insideRight',
                    style: { fill: CHART_COLORS.accuracy, fontFamily: 'Rubik', fontSize: '14px' },
                  }}
                />
                <Tooltip content={<CustomTooltip t={t} />} />
                <Legend
                  wrapperStyle={{ fontFamily: 'Rubik', fontSize: '14px', color: CHART_COLORS.text }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="wordsLearned"
                  stroke={CHART_COLORS.wordsLearned}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.wordsLearned, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={t('teacher.progress.wordsLearned')}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  stroke={CHART_COLORS.accuracy}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.accuracy, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={t('teacher.progress.accuracy') + ' %'}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
