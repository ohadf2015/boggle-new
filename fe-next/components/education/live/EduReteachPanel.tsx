'use client';

import { Loader2, RotateCcw, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MissedWord } from './eduReteachModel';
import type { ReteachStatus } from './useReteachRound';
import { ReteachStatusNote } from './ReteachStatusNote';
import { PRESS, type Translate } from './eduLiveStyles';

const MAX_CHIPS = 8;

interface EduReteachPanelProps {
  words: MissedWord[];
  underHalf: number;
  status: ReteachStatus;
  onReplay: (words: string[]) => void;
  onRestoreFull?: () => void;
  t: Translate;
}

export function EduReteachPanel({ words, underHalf, status, onReplay, onRestoreFull, t }: EduReteachPanelProps) {
  if (words.length === 0) return null;
  const shown = words.slice(0, MAX_CHIPS);
  const rest = words.length - shown.length;
  const pending = status === 'pending';

  return (
    <section data-testid="edu-reteach-panel" className="flex shrink-0 flex-col gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 py-3 shadow-hard lg:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="inline-flex items-center gap-2 font-neo-display text-base font-black text-neo-cream lg:text-xl 2xl:text-2xl">
          <Target className="size-5 shrink-0 text-neo-pink" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.mostMissed')}
        </h2>
        {underHalf > 0 && (
          <p data-testid="edu-needs-help-count" className="font-neo-body text-sm font-bold text-neo-cream/80 lg:text-base">
            {t('eduLiveRoom.hostResults.needHelpCount', { count: underHalf })}
          </p>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((w) => (
          <li
            key={w.word}
            data-testid="edu-most-missed-word"
            dir="auto"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-black lg:text-lg"
          >
            {w.word}
            {w.notOnBoard ? (
              <span className="font-neo-body text-xs font-bold text-neo-black/70 lg:text-sm">{t('eduLiveRoom.hostResults.notOnBoard')}</span>
            ) : (
              <span dir="ltr" className="font-neo-body text-xs font-bold tabular-nums text-neo-black/70 lg:text-sm">
                {w.found}/{w.of}
              </span>
            )}
          </li>
        ))}
        {rest > 0 && (
          <li data-testid="edu-most-missed-more" className="inline-flex items-center rounded-full border-2 border-neo-cream/60 px-2.5 py-0.5 font-neo-body text-sm font-bold text-neo-cream">
            {t('eduLiveRoom.hostResults.moreWords', { count: rest })}
          </li>
        )}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="edu-replay-missed"
          disabled={pending}
          aria-busy={pending}
          onClick={() => onReplay(words.map((w) => w.word))}
          className={cn(
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-pink px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-black shadow-hard-sm lg:text-base',
            PRESS
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}
          {t('eduLiveRoom.hostResults.replayMissed', { count: words.length })}
        </button>
        <ReteachStatusNote status={status} onRestoreFull={onRestoreFull} t={t} />
      </div>
    </section>
  );
}

export default EduReteachPanel;
