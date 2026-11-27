'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useLessonEffectiveness } from '@/hooks/useLessonEffectiveness';
import type { LessonEffectivenessData } from '@/lib/supabase/analytics';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/PageLoader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export const CHART_COLORS = {
  avgXpGain: '#00FFFF',
  completionRate: '#FF1493',
  avgXpGainInk: 'var(--edu-cyan-ink)',
  completionRateInk: 'var(--edu-pink-ink)',
  grid: 'var(--edu-line)',
  text: 'var(--edu-ink)',
  tooltip: 'var(--edu-surface)',
  tooltipBorder: 'var(--edu-line)',
};

// Custom tooltip component (must be outside render)
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LessonEffectivenessData }>;
  t: (key: string) => string;
}

const CustomTooltip = ({ active, payload, t }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div
      className="border-neo shadow-hard p-3 rounded-neo"
      style={{ backgroundColor: CHART_COLORS.tooltip, borderColor: CHART_COLORS.tooltipBorder }}
    >
      <p className="text-edu-ink font-neo-body font-bold mb-2">{data.lessonName}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.avgXpGain }} />
          <span className="text-edu-cyan-ink text-sm">
            {t('education.analytics.avgXpGain')}: {data.averageXpGain}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.completionRate }} />
          <span className="text-edu-pink-ink text-sm">
            {t('education.analytics.completionRate')}: {data.completionRate}%
          </span>
        </div>
        <div className="text-edu-ink text-sm mt-2">
          {t('education.analytics.avgAccuracy')}: {data.averageAccuracy}%
        </div>
        <div className="text-edu-ink text-sm">
          {t('education.analytics.students')}: {data.totalStudents}
        </div>
      </div>
    </div>
  );
};

interface LessonEffectivenessChartProps {
  classroomId: string;
}

export function LessonEffectivenessChart({ classroomId }: LessonEffectivenessChartProps) {
  const { t } = useLanguage();
  const { effectiveness, isLoading, error } = useLessonEffectiveness({ classroomId });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <PageLoader size="md" text={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-neo border-edu-line shadow-hard bg-edu-surface/50">
        <CardContent className="py-12 text-center">
          <p className="text-red-400">{t('education.analytics.error')}</p>
        </CardContent>
      </Card>
    );
  }

  if (effectiveness.length === 0) {
    return (
      <Card className="border-neo border-edu-line shadow-hard bg-edu-surface/50">
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 text-edu-ink mx-auto mb-4" />
          <h3 className="text-xl font-neo-display text-edu-ink mb-2">
            {t('education.analytics.noLessons')}
          </h3>
          <p className="text-edu-ink">{t('education.analytics.assignLessonsHint')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-neo border-edu-line shadow-hard bg-edu-surface/80">
      <CardHeader>
        <CardTitle className="text-2xl font-neo-display text-edu-ink">
          {t('education.analytics.lessonEffectiveness')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={effectiveness}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} strokeOpacity={0.2} />
            <XAxis
              dataKey="lessonName"
              stroke={CHART_COLORS.text}
              style={{ fontSize: '12px', fontFamily: 'Rubik' }}
            />
            <YAxis
              yAxisId="left"
              stroke={CHART_COLORS.avgXpGainInk}
              style={{ fontSize: '12px', fontFamily: 'Rubik' }}
              label={{
                value: t('education.analytics.avgXpGain'),
                angle: -90,
                position: 'insideLeft',
                style: { fill: CHART_COLORS.avgXpGainInk, fontFamily: 'Rubik', fontSize: '14px' },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={CHART_COLORS.completionRateInk}
              style={{ fontSize: '12px', fontFamily: 'Rubik' }}
              label={{
                value: t('education.analytics.completionRate'),
                angle: 90,
                position: 'insideRight',
                style: { fill: CHART_COLORS.completionRateInk, fontFamily: 'Rubik', fontSize: '14px' },
              }}
            />
            <Tooltip content={<CustomTooltip t={t} />} />
            <Legend
              wrapperStyle={{ fontFamily: 'Rubik', fontSize: '14px', color: CHART_COLORS.text }}
            />
            <Bar
              yAxisId="left"
              dataKey="averageXpGain"
              fill={CHART_COLORS.avgXpGain}
              name={t('education.analytics.avgXpGain')}
            />
            <Bar
              yAxisId="right"
              dataKey="completionRate"
              fill={CHART_COLORS.completionRate}
              name={t('education.analytics.completionRate') + ' %'}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
