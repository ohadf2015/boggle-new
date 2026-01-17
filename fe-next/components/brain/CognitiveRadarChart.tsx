'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook to track container dimensions and only render when valid
 * Prevents Recharts "width(-1) and height(-1)" warning
 */
function useContainerDimensions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const checkDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Only mark as ready if dimensions are valid (>= 100 for minimum usable chart)
        if (clientWidth >= 100 && clientHeight >= 100) {
          setDimensions({ width: clientWidth, height: clientHeight });
        } else {
          // Reset if dimensions become too small
          setDimensions(null);
        }
      }
    };

    // Check immediately
    checkDimensions();

    // Also check on next frame in case of layout shift
    const frameId = requestAnimationFrame(checkDimensions);

    // Set up resize observer for dynamic changes
    const observer = new ResizeObserver(checkDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Add polling as fallback for edge cases (reduced frequency)
    const pollInterval = setInterval(checkDimensions, 250);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      clearInterval(pollInterval);
    };
  }, []);

  return { containerRef, dimensions, isReady: dimensions !== null };
}

interface CognitiveRadarChartProps {
  domains: {
    processingSpeed: { score: number };
    workingMemory: { score: number };
    attention: { score: number };
    flexibility: { score: number };
    vocabulary: { score: number };
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  t: (key: string) => string;
}

const CustomTooltip = ({ active, payload, t }: CustomTooltipProps) => {
  if (!active || !payload || !payload[0]) return null;

  return (
    <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-2 shadow-hard text-neo-black">
      <p className="font-bold text-sm">{payload[0].payload.domain}</p>
      <p className="text-xs">
        {t('brain.score')}: <span className="font-black">{payload[0].value}/100</span>
      </p>
    </div>
  );
};

/**
 * Cognitive Radar Chart Component
 * Modern radar chart visualization of cognitive domains.
 */
export default function CognitiveRadarChart({ domains }: CognitiveRadarChartProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Track container dimensions to prevent Recharts rendering with invalid size
  const { containerRef, dimensions, isReady } = useContainerDimensions();

  // Transform data for recharts
  const chartData = [
    {
      domain: t('brain.domains.processingSpeed'),
      score: domains.processingSpeed.score,
      fullMark: 100,
    },
    {
      domain: t('brain.domains.workingMemory'),
      score: domains.workingMemory.score,
      fullMark: 100,
    },
    {
      domain: t('brain.domains.attention'),
      score: domains.attention.score,
      fullMark: 100,
    },
    {
      domain: t('brain.domains.flexibility'),
      score: domains.flexibility.score,
      fullMark: 100,
    },
    {
      domain: t('brain.domains.vocabulary'),
      score: domains.vocabulary.score,
      fullMark: 100,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-neo border-4 border-neo-black shadow-hard-lg p-4 sm:p-6',
        'relative overflow-hidden',
        isDarkMode
          ? 'bg-neo-navy'
          : 'bg-gradient-to-br from-white via-gray-50 to-white'
      )}
    >
      {/* Animated background gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-10 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 80%, rgba(255, 20, 147, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.3) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Header */}
      <div className="relative z-10 flex items-center justify-center gap-2 mb-4">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Brain className={cn(
            'w-6 h-6',
            isDarkMode ? 'text-neo-cyan' : 'text-purple-600'
          )} />
        </motion.div>
        <h3 className={cn(
          'text-lg font-black uppercase tracking-wide text-center',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.radarChart')}
        </h3>
      </div>

      {/* Radar Chart */}
      <div ref={containerRef} className="relative z-10 w-full h-[280px] sm:h-[320px] min-h-[280px]">
        {isReady && dimensions ? (
        <ResponsiveContainer width={dimensions.width} height={dimensions.height} minWidth={100} minHeight={100}>
          <RadarChart data={chartData}>
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FFFF" stopOpacity={0.9} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#FF1493" stopOpacity={0.5} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Grid */}
            <PolarGrid
              stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
              strokeWidth={2}
            />

            {/* Angle Axis (Domain labels) */}
            <PolarAngleAxis
              dataKey="domain"
              tick={{
                fill: isDarkMode ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)',
                fontSize: 11,
                fontWeight: 'bold',
              }}
              tickLine={false}
            />

            {/* Radius Axis (Score scale) */}
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{
                fill: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                fontSize: 10,
                fontWeight: 'bold',
              }}
              axisLine={false}
            />

            {/* Tooltip */}
            <Tooltip content={<CustomTooltip t={t} />} />

            {/* Radar Data */}
            <Radar
              name={t('brain.score')}
              dataKey="score"
              stroke="url(#radarGradient)"
              fill="url(#radarGradient)"
              fillOpacity={0.7}
              strokeWidth={4}
              filter="url(#glow)"
              dot={{
                r: 6,
                fill: '#00FFFF',
                stroke: isDarkMode ? '#fff' : '#000',
                strokeWidth: 2.5,
                filter: 'url(#glow)',
              }}
              activeDot={{
                r: 8,
                fill: '#FF1493',
                stroke: isDarkMode ? '#fff' : '#000',
                strokeWidth: 3,
                filter: 'url(#glow)',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className={cn(
              'text-sm font-bold',
              isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
            )}>
              {t('common.loading')}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="relative z-10 flex items-center justify-center gap-2 mt-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-cream/50">
          <motion.div
            className="w-3 h-3 rounded-full border-2 border-neo-black bg-gradient-to-r from-neo-cyan via-purple-400 to-neo-pink"
            animate={{
              boxShadow: [
                '0 0 8px rgba(0, 255, 255, 0.5)',
                '0 0 12px rgba(139, 92, 246, 0.5)',
                '0 0 8px rgba(255, 20, 147, 0.5)',
                '0 0 8px rgba(0, 255, 255, 0.5)',
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className={cn(
            'text-xs font-bold',
            isDarkMode ? 'text-neo-white' : 'text-neo-black'
          )}>
            {t('brain.currentScores')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
