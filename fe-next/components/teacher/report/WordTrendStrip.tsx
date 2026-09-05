'use client';

import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { WordTrend } from '@/lib/education/classReport';

export interface WordTrendStripProps {
  trends: WordTrend[];
  /** How many words to chart. The tail is noise on a projector. */
  limit?: number;
}

const DEFAULT_LIMIT = 8;

/** A bar's height floor, so a 0% game still draws something to point at. */
const MIN_BAR_PCT = 6;

type Direction = 'improved' | 'worse' | 'flat';

function directionOf(delta: number): Direction {
  if (delta < 0) return 'improved';
  if (delta > 0) return 'worse';
  return 'flat';
}

const DIRECTION_STYLE: Record<Direction, { chip: string; icon: React.ReactNode }> = {
  improved: { chip: 'bg-neo-lime', icon: <TrendingDown className="w-3.5 h-3.5" aria-hidden /> },
  worse: { chip: 'bg-neo-pink', icon: <TrendingUp className="w-3.5 h-3.5" aria-hidden /> },
  flat: { chip: 'bg-neo-cream', icon: <Minus className="w-3.5 h-3.5" aria-hidden /> },
};

/**
 * Miss % per word across the classroom's recent games, one tiny bar per game,
 * oldest on the leading edge.
 *
 * A shrinking bar means the reteaching worked, which is the only question a
 * second game can answer that the first cannot. Words the class has seen only
 * once are excluded upstream by `buildWordTrends`, so nothing here fakes a
 * trend out of a single point.
 */
export function WordTrendStrip({ trends, limit = DEFAULT_LIMIT }: WordTrendStripProps) {
  const { t } = useLanguage();

  if (trends.length === 0) {
    return (
      <p
        data-testid="report-trend-empty"
        className="font-neo-body text-sm text-black/70 text-start"
      >
        {t('teacher.classReport.trendEmpty')}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none p-0 m-0">
      {trends.slice(0, limit).map((trend) => {
        const direction = directionOf(trend.delta);
        const style = DIRECTION_STYLE[direction];
        const latest = trend.points[trend.points.length - 1].missPct;
        return (
          <li
            key={trend.key}
            data-testid="report-trend-word"
            data-word={trend.word}
            data-direction={direction}
            className="flex items-center gap-3 rounded-neo border-2 border-black bg-white px-3 py-2"
          >
            <span className="font-neo-body font-black text-black text-sm flex-1 min-w-0 truncate text-start">
              {trend.word}
            </span>

            {/* One bar per game, oldest first. Height = that game's miss %. */}
            <span
              className="flex items-end gap-1 h-8 shrink-0"
              role="img"
              aria-label={t('teacher.classReport.trendBarsLabel', undefined, {
                word: trend.word,
                first: String(trend.points[0].missPct),
                last: String(latest),
              })}
            >
              {trend.points.map((point) => (
                <span
                  key={point.gameCode}
                  data-testid="report-trend-bar"
                  data-miss-pct={point.missPct}
                  className={cn(
                    'w-2.5 rounded-t-sm border-2 border-black',
                    point.missPct >= 50 ? 'bg-neo-pink' : 'bg-neo-lime'
                  )}
                  style={{ height: `${Math.max(MIN_BAR_PCT, point.missPct)}%` }}
                />
              ))}
            </span>

            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-neo border-2 border-black px-2 py-0.5',
                'font-neo-body font-black text-black text-xs tabular-nums shrink-0',
                style.chip
              )}
            >
              {style.icon}
              {trend.delta > 0 ? '+' : ''}
              {trend.delta}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default WordTrendStrip;
