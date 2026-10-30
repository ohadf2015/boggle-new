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
  /** Smaller icon and value on phones, for a two-up grid. */
  compact?: boolean;
  /** Teacher class report: one navy tile, no colored fills, outlined action. */
  tone?: 'default' | 'calm';
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
  compact = false,
  tone = 'default',
}: MetricCardProps) {
  if (tone === 'calm') {
    return (
      <div
        data-testid={testId}
        data-severity={severity ?? 'info'}
        className="flex min-w-0 flex-col justify-between gap-1 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-2 py-1.5 text-neo-cream sm:px-3 sm:py-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="shrink-0 text-neo-cream/70 max-sm:hidden [&_svg]:size-4">{icon}</span>
          <span className="font-neo-display text-lg font-bold tabular-nums leading-none sm:text-2xl">{value}</span>
          {trend && trendValue && <span className="text-xs font-bold text-neo-cream/70 max-sm:hidden">{trendValue}</span>}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="font-neo-body text-[11px] font-bold leading-tight text-neo-cream/85 sm:text-sm">{title}</span>
          {actionable && (
            <button
              type="button"
              onClick={actionable.onClick}
              className="min-h-8 rounded-neo border-2 border-neo-cream/60 px-2 font-neo-body text-xs font-bold text-neo-cream max-sm:hidden transition-colors hover:bg-neo-cream/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime"
            >
              {actionable.label}
            </button>
          )}
        </div>
      </div>
    );
  }
  // ==================== STYLING ====================

  // Card bg + icon bg based on severity
  const cardBg = {
    info: 'bg-neo-cyan',
    warning: 'bg-neo-lime',
    urgent: 'bg-neo-pink',
  }[severity || 'info'] || 'bg-neo-cyan';

  const iconBg = {
    info: 'bg-black',
    warning: 'bg-black',
    urgent: 'bg-black',
  }[severity || 'info'] || 'bg-black';

  const iconFg = {
    info: 'text-neo-cyan',
    warning: 'text-neo-lime',
    urgent: 'text-neo-pink',
  }[severity || 'info'] || 'text-neo-cyan';

  // Trend color based on direction
  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-neo-white',
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
        'rounded-neo border-3 border-black shadow-hard-sm overflow-hidden',
        'flex flex-col'
      )}
    >
      {/* Colored header */}
      <div className={cn('flex items-center', compact ? 'gap-2 px-3 pt-3 pb-2.5 sm:gap-3 sm:px-4 sm:pt-4 sm:pb-3' : 'px-4 pt-4 pb-3 gap-3', cardBg)}>
        <div className={cn(
          'rounded-neo border-3 border-black flex items-center justify-center shrink-0 shadow-hard-sm',
          compact ? 'size-9 sm:size-11 [&_svg]:size-5 sm:[&_svg]:size-6' : 'w-11 h-11',
          iconBg
        )}>
          <span className={iconFg}>{icon}</span>
        </div>
        <div className={cn('font-neo-display font-black text-black tabular-nums leading-none', compact ? 'min-w-0 text-2xl sm:text-4xl' : 'text-4xl')}>
          {value}
        </div>
      </div>

      {/* White body */}
      <div className={cn('bg-neo-cream flex flex-col gap-2 flex-1 border-t-3 border-black', compact ? 'px-3 py-2.5 sm:px-4 sm:py-3' : 'px-4 py-3')}>
        {/* Title */}
        <div className="text-sm font-neo-body font-bold text-black">{title}</div>

        {/* Trend Indicator */}
        {trend && trendValue && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-black font-neo-body px-2 py-0.5 rounded-neo w-fit',
            {
              up: 'text-black bg-neo-cyan/20',
              down: 'text-neo-pink bg-neo-pink/10',
              neutral: 'text-black/60 bg-black/5',
            }[trend]
          )}>
            {trendIcon}
            <span>{trendValue}</span>
          </div>
        )}

        {/* Actionable Button */}
        {actionable && (
          <button type="button"
            onClick={actionable.onClick}
            className={cn(
              'mt-1 px-3 py-2 bg-black text-neo-lime',
              'font-black font-neo-body text-sm rounded-neo border-3 border-black shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
              'transition duration-100',
              'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
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
