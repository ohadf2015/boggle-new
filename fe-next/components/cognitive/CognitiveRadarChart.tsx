'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  type CognitiveDomainScores,
  COGNITIVE_DOMAIN_CONFIG,
} from '@/shared/types/cognitiveScores';

interface CognitiveRadarChartProps {
  /** Domain scores object */
  scores: CognitiveDomainScores;
  /** Show compact version */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Animate on mount */
  animate?: boolean;
}

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  t,
}: {
  active?: boolean;
  payload?: Array<{ payload: { domain: string; score: number; fullName: string; icon: string } }>;
  t: (key: string) => string;
}) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-2 shadow-hard text-neo-black min-w-[100px]">
      <div className="flex items-center gap-2 mb-1">
        <span>{data.icon}</span>
        <span className="font-bold text-xs">{data.fullName}</span>
      </div>
      <div className="font-black text-xl">
        {data.score}
        <span className="text-sm font-bold text-neo-black/60">/100</span>
      </div>
    </div>
  );
};

/**
 * CognitiveRadarChart - Pentagon radar chart showing 5 cognitive domains
 * Uses Recharts for smooth radar visualization
 */
const CognitiveRadarChart: React.FC<CognitiveRadarChartProps> = ({
  scores,
  compact = false,
  className,
  animate = true,
}) => {
  const { t } = useLanguage();

  // Transform scores to radar chart data
  const chartData = useMemo(() => {
    return COGNITIVE_DOMAIN_CONFIG.map((domain) => ({
      domain: domain.icon,
      score: scores[domain.key],
      fullName: t(domain.labelKey) || domain.key,
      icon: domain.icon,
    }));
  }, [scores, t]);

  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
        'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800',
        className
      )}
    >
      {/* Halftone texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
        }}
      />

      <div className="relative z-10 p-3">
        {/* Chart */}
        <div className={cn('w-full', compact ? 'h-40' : 'h-56')}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
            >
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neo-cyan)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="var(--neo-lime)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <PolarGrid
                gridType="polygon"
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="domain"
                tick={{
                  fill: 'white',
                  fontSize: compact ? 14 : 18,
                }}
                tickLine={false}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }}
                tickCount={5}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="var(--neo-cyan)"
                strokeWidth={3}
                fill="url(#radarGradient)"
                fillOpacity={0.6}
                animationDuration={animate ? 1000 : 0}
                animationEasing="ease-out"
              />
              <Tooltip content={<CustomTooltip t={t} />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend (non-compact only) */}
        {!compact && (
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {COGNITIVE_DOMAIN_CONFIG.map((domain) => (
              <div
                key={domain.key}
                className="flex items-center gap-1 text-[10px] text-white/70"
              >
                <span>{domain.icon}</span>
                <span className="font-medium">{t(domain.labelKey) || domain.key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CognitiveRadarChart;
