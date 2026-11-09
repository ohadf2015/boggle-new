'use client';

import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RivalRecord } from './mpResultsStory';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpH2HStripProps {
  h2h: RivalRecord;
  onRematch?: () => void;
  className?: string;
  t: TFn;
}

/** Compact head-to-head record when live data exists — never invents wins. */
export function MpH2HStrip({ h2h, onRematch, className, t }: MpH2HStripProps) {
  if (h2h.meetings <= 0) return null;
  return (
    <div
      data-testid="mp-h2h-strip"
      className={cn(
        'flex items-center gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light/80 px-3 py-1.5 text-[calc(12px*var(--mp-u,1))] font-bold text-neo-cream',
        className,
      )}
    >
      <Swords aria-hidden="true" className="w-4 h-4 text-neo-lime shrink-0" />
      <span className="truncate min-w-0" dir="auto">
        {t('mpUi.results.h2h.record', {
          mine: h2h.myWins,
          theirs: h2h.theirWins,
          name: h2h.name,
        })}
      </span>
      {onRematch && (
        <button
          type="button"
          data-testid="mp-h2h-rematch"
          onClick={onRematch}
          className="ms-auto shrink-0 uppercase text-neo-lime underline-offset-2 hover:underline"
        >
          {t('mpUi.results.rematch')}
        </button>
      )}
    </div>
  );
}

export default MpH2HStrip;
