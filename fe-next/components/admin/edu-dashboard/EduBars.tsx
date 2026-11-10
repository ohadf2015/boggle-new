'use client';

import { MUTED } from './eduDashboardShared';

export interface Bar {
  label: string;
  value: number;
  highlight?: boolean;
}

/** Plain-div vertical bars. Each bar carries its value as text so no reader depends on colour or height. */
export function Bars({ bars, testId, ariaLabel }: { bars: Bar[]; testId?: string; ariaLabel: string }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <ul data-testid={testId} aria-label={ariaLabel} className="flex h-28 items-end gap-1">
      {bars.map((b, i) => (
        <li key={`${b.label}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${b.value}`}>
          <span className={`text-[10px] tabular-nums ${MUTED}`}>{b.value > 0 ? b.value : ''}</span>
          <span
            className={`w-full rounded-t ${b.highlight ? 'bg-neo-lime' : 'bg-neo-cyan/70'}`}
            style={{ height: `${Math.max(b.value > 0 ? 6 : 2, (b.value / max) * 70)}%` }}
          />
          <span className={`truncate text-[10px] ${MUTED}`}>{b.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function EduStat({
  label,
  value,
  hint,
  testId,
  tone,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  testId?: string;
  tone?: 'warn' | 'good';
}) {
  const color = tone === 'warn' ? 'text-neo-yellow' : tone === 'good' ? 'text-neo-lime' : 'text-neo-white';
  return (
    <div data-testid={testId} className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light/95 p-3">
      <p className="text-xs font-semibold text-neo-cream/70">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value ?? '—'}</p>
      {hint && <p className={`text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}
