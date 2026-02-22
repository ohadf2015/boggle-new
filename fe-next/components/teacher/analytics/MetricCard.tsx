'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MetricCardProps {
  /** Title of the metric (translation key or plain text) */
  title: string;
  /** Value to display (number or string like "85%") */
  value: number | string;
  /** Icon to display on the left */
  icon: React.ReactNode;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend value text (e.g., "+12% vs last week") */
  trendValue?: string;
  /** Severity level affects border color */
  severity?: 'info' | 'warning' | 'urgent';
  /** Actionable button configuration */
  actionable?: {
    label: string;
    onClick: () => void;
  };
  /** Test ID for testing */
  testId?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * MetricCard Component
 *
 * Neo-brutalist metric card with optional trend indicator and actionable button.
 * Used in AnalyticsDashboard to display KPIs like students needing help, class average, etc.
 *
 * @example
 * <MetricCard
 *   title="Students Needing Help"
 *   value={5}
 *   icon={<AlertTriangle />}
 *   severity="urgent"
 *   trend="up"
 *   trendValue="+2 from yesterday"
 *   actionable={{
 *     label: "View Students",
 *     onClick: () => navigate('/students?filter=struggling')
 *   }}
 * />
 */
export function MetricCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  severity,
  actionable,
  testId = 'metric-card',
}: MetricCardProps) {
  // ==================== STYLING ====================

  // Card bg + icon bg based on severity
  const cardBg = {
    info: 'bg-neo-cyan',
    warning: 'bg-neo-yellow',
    urgent: 'bg-neo-pink',
  }[severity || 'info'] || 'bg-neo-cyan';

  const iconBg = {
    info: 'bg-black',
    warning: 'bg-black',
    urgent: 'bg-black',
  }[severity || 'info'] || 'bg-black';

  const iconFg = {
    info: 'text-neo-cyan',
    warning: 'text-neo-yellow',
    urgent: 'text-neo-pink',
  }[severity || 'info'] || 'text-neo-cyan';

  // Trend color based on direction
  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-neo-white/60',
  }[trend || 'neutral'];

  // Trend icon
  const trendIcon = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    neutral: <Minus className="w-4 h-4" />,
  }[trend || 'neutral'];

  // ==================== RENDER ====================

  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-neo border-3 shadow-hard overflow-hidden',
        'flex flex-col',
        {
          info: 'border-neo-cyan',
          warning: 'border-neo-orange',
          urgent: 'border-neo-pink',
        }[severity || 'info'] || 'border-neo-cyan'
      )}
    >
      {/* Colored header */}
      <div className={cn('px-4 pt-4 pb-3 flex items-center gap-3', cardBg)}>
        <div className={cn(
          'w-11 h-11 rounded-neo border-2 border-black flex items-center justify-center flex-shrink-0 shadow-hard-sm',
          iconBg
        )}>
          <span className={iconFg}>{icon}</span>
        </div>
        <div className="text-4xl font-neo-display font-black text-black tabular-nums leading-none">
          {value}
        </div>
      </div>

      {/* White body */}
      <div className="bg-white px-4 py-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <div className="text-sm font-neo-body font-bold text-black">{title}</div>

        {/* Trend Indicator */}
        {trend && trendValue && (
          <div className={cn('flex items-center gap-1 text-sm font-bold font-neo-body', trendColor)}>
            {trendIcon}
            <span>{trendValue}</span>
          </div>
        )}

        {/* Actionable Button */}
        {actionable && (
          <button
            onClick={actionable.onClick}
            className={cn(
              'mt-1 px-3 py-2 bg-black text-white',
              'font-bold font-neo-body text-sm rounded-neo shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
              'transition-all duration-100',
              'focus:outline-none focus:ring-2 focus:ring-black'
            )}
          >
            {actionable.label}
          </button>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
