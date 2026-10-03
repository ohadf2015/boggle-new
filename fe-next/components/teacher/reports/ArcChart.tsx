'use client';

import type { SessionAccuracyPoint } from '@/lib/education/wordMasteryTrend';
import { cn } from '@/lib/utils';

const Y_TICKS = [100, 50, 0];
const MAX_DATE_LABELS = 6;

export function shortDate(iso: string, language: string) {
  return new Date(iso).toLocaleDateString(language, { month: 'short', day: 'numeric' });
}

function pointLabels(points: SessionAccuracyPoint[], language: string) {
  const days = points.map((p) => shortDate(p.at, language));
  const repeated = new Set(days.filter((d, i) => days.indexOf(d) !== i));
  return points.map((p, i) =>
    repeated.has(days[i])
      ? `${days[i]} ${new Date(p.at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`
      : days[i],
  );
}

function xPercent(i: number, count: number) {
  return count === 1 ? 50 : 4 + (i / (count - 1)) * 92;
}

function showDate(i: number, count: number) {
  if (count <= MAX_DATE_LABELS) return true;
  const step = Math.ceil(count / (MAX_DATE_LABELS - 1));
  return i === 0 || i === count - 1 || (i % step === 0 && count - 1 - i >= step / 2);
}

export function ArcChart({
  points,
  goal,
  language,
  label,
  goalLabel,
}: {
  points: SessionAccuracyPoint[];
  goal: number;
  language: string;
  label: string;
  goalLabel: string;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const labels = pointLabels(points, language);
  const line = points.map((p, i) => `${xPercent(i, points.length)},${100 - clamp(p.accuracy)}`).join(' ');

  return (
    <figure data-testid="student-arc-chart" dir="ltr" role="img" aria-label={label} className="select-none">
      <div className="flex gap-x-2">
        <div className="relative h-48 w-11 shrink-0 text-end text-[11px] font-bold tabular-nums text-neo-cream/60" aria-hidden="true">
          {Y_TICKS.map((tick) => (
            <span
              key={tick}
              data-testid="student-arc-y-tick"
              className="absolute end-0 -translate-y-1/2"
              style={{ top: `${100 - tick}%` }}
            >
              {tick}%
            </span>
          ))}
        </div>

        <div className="relative h-48 min-w-0 flex-1 rounded-neo border-2 border-neo-cream/40 bg-neo-navy">
          {Y_TICKS.map((tick) => (
            <span
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-neo-cream/10"
              style={{ top: `${100 - tick}%` }}
            />
          ))}
          <span
            data-testid="student-arc-goal"
            className="absolute inset-x-0 border-t-2 border-dashed border-neo-lime/80"
            style={{ top: `${100 - goal}%` }}
          >
            <span className="absolute end-1 -top-5 rounded-sm bg-neo-navy px-1 text-[11px] font-black uppercase text-neo-lime">
              {goalLabel}
            </span>
          </span>
          {points.length > 1 && (
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible"
            >
              <polyline
                points={line}
                fill="none"
                stroke="var(--color-neo-cyan, #00FFFF)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {points.map((p, i) => {
            const met = p.accuracy >= goal;
            return (
              <span
                key={`${p.gameCode}-${i}`}
                data-testid="student-arc-point"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${xPercent(i, points.length)}%`, top: `${100 - clamp(p.accuracy)}%` }}
                title={`${labels[i]} · ${p.found}/${p.asked}`}
              >
                <span
                  className={cn(
                    'block size-3.5 rounded-full border-2 border-neo-navy',
                    met ? 'bg-neo-lime' : 'bg-neo-pink',
                  )}
                />
                <span
                  className={cn(
                    'absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black tabular-nums text-neo-white',
                    p.accuracy > 85 ? 'top-4' : '-top-5',
                  )}
                >
                  {p.accuracy}%
                </span>
              </span>
            );
          })}
        </div>

      </div>
      <div className="flex gap-x-2">
        <span aria-hidden="true" className="w-11 shrink-0" />
        <div className="relative mt-1 h-5 min-w-0 flex-1 text-[11px] font-bold text-neo-cream/70" aria-hidden="true">
          {points.map((p, i) => {
            if (!showDate(i, points.length)) return null;
            const first = points.length > 1 && i === 0;
            const last = points.length > 1 && i === points.length - 1;
            return (
              <span
                key={`${p.gameCode}-${i}`}
                data-testid="student-arc-date"
                className={cn('absolute whitespace-nowrap', first ? 'start-0' : last ? 'end-0' : '-translate-x-1/2')}
                style={first || last ? undefined : { left: `${xPercent(i, points.length)}%` }}
              >
                {labels[i]}
              </span>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
