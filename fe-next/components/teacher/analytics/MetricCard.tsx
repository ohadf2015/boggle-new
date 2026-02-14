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

  // Border color based on severity
  const borderColor = {
    info: 'border-neo-cyan',
    warning: 'border-neo-orange',
    urgent: 'border-neo-pink',
  }[severity || 'info'] || 'border-neo-black';

  // Icon color based on severity
  const iconColor = {
    info: 'text-neo-cyan',
    warning: 'text-neo-orange',
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
        'bg-neo-navy border-neo shadow-hard rounded-neo p-4',
        'flex flex-col gap-3',
        borderColor
      )}
    >
      {/* Top Row: Icon and Value */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0', iconColor)}>{icon}</div>

        {/* Value */}
        <div className="flex-1">
          <div className="text-4xl font-neo-display font-bold text-neo-white">
            {value}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-sm text-neo-white/70 font-neo-body">{title}</div>

      {/* Trend Indicator */}
      {trend && trendValue && (
        <div className={cn('flex items-center gap-1 text-sm font-neo-body', trendColor)}>
          {trendIcon}
          <span>{trendValue}</span>
        </div>
      )}

      {/* Actionable Button */}
      {actionable && (
        <button
          onClick={actionable.onClick}
          className={cn(
            'mt-2 px-4 py-2 bg-neo-cyan text-neo-black',
            'font-bold font-neo-body text-sm rounded-neo shadow-hard-sm',
            'hover:shadow-hard-pressed active:shadow-hard-pressed',
            'transition-all duration-100',
            'focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 focus:ring-offset-neo-navy'
          )}
        >
          {actionable.label}
        </button>
      )}
    </div>
  );
}

export default MetricCard;
