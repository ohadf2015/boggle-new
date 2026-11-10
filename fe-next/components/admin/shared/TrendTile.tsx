'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MUTED, PANEL } from './panelStyles';
import { useCountUpTo } from './useCountUpTo';

export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(id);
  }, []);
  return entered;
}

/** A thin trend line; decoration only, the numbers carry the meaning. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const entered = useEntered();
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${30 - (v / max) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-6 w-full" aria-hidden="true">
      <polyline
        points={points}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={1}
        strokeDashoffset={entered ? 0 : 1}
        className={cn('text-neo-cyan transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none', className)}
      />
    </svg>
  );
}

const DELTA_TONE = { up: 'text-neo-lime', down: 'text-neo-red', flat: MUTED } as const;

export interface TrendTileProps {
  testId: string;
  label: string;
  /** A number counts up; a string (e.g. "34%") shows as given; null shows `noData`. */
  value: number | string | null;
  /** Plain-words change against the previous period. */
  deltaText?: string | null;
  deltaTone?: keyof typeof DELTA_TONE;
  definition?: string;
  hint?: string;
  noData?: string;
  spark?: number[] | null;
  action?: { label: string; onClick: () => void } | null;
  /** Makes the whole tile a button (e.g. scroll to the chart behind the number). */
  onSelect?: () => void;
  icon?: ReactNode;
}

function Value({ value }: { value: number }) {
  return <>{useCountUpTo(value)}</>;
}

/** One headline number with its change, trend line and an optional drill. Used by every admin overview. */
export function TrendTile({ testId, label, value, deltaText, deltaTone = 'flat', definition, hint, noData, spark, action, onSelect, icon }: TrendTileProps) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-neo-cream">
        {icon}
        {label}
      </p>
      {value === null ? (
        <p className={`text-sm ${MUTED}`}>{noData}</p>
      ) : (
        <>
          <p className="text-3xl font-bold tabular-nums text-neo-white">{typeof value === 'number' ? <Value value={value} /> : value}</p>
          {deltaText && (
            <p data-testid={`${testId}-delta`} className={`text-xs tabular-nums ${DELTA_TONE[deltaTone]}`}>
              {deltaText}
            </p>
          )}
        </>
      )}
      {hint && <p className={`text-xs ${MUTED}`}>{hint}</p>}
      {definition && <p className={`text-xs ${MUTED}`}>{definition}</p>}
      {spark && <Sparkline values={spark} />}
    </>
  );
  return (
    <div data-testid={testId} className={cn(PANEL, 'flex flex-col gap-1 text-start', onSelect && 'cursor-pointer transition-colors hover:border-neo-cyan')}>
      {onSelect ? (
        <button type="button" onClick={onSelect} className="flex flex-1 flex-col gap-1 text-start focus-visible:outline-2 focus-visible:outline-neo-cyan">
          {body}
        </button>
      ) : (
        body
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-auto self-start text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neo-cyan"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
