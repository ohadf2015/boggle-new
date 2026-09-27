'use client';

/**
 * The gap between "I tapped play" and "the board is here".
 *
 * It used to be a bare spinner reading "Waiting for opponent…" with no name, no
 * mascot and — the part that got us disqualified — no exit. When the join raced
 * the server (a rematch navigates both clients the instant the duel exists) the
 * spinner never resolved and the only recovery was the browser's back button.
 *
 * Now: the knight waits WITH you, it names who you are waiting for, it keeps
 * the series score on screen so the stakes survive the gap, and if the duel
 * plainly is not coming it says so and hands over two real controls.
 *
 * Dark-only surface — `bg-neo-navy` hardcoded (Class 5), no entrance opacity
 * tween on the full-screen layer, static resting state fully painted.
 */

import { RotateCcw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Loader } from '@/components/ui/Loader';
import type { DuelSeries, DuelSeriesStatus } from '@/lib/education/duelSeries';
import { cn } from '@/lib/utils';
import { DuelSeriesTally } from './DuelSeriesTally';

export interface DuelWaitingRoomProps {
  opponentName: string;
  /** The join has been answered with an error as often as it is worth trying. */
  stalled: boolean;
  onRetry: () => void;
  onBackToLobby?: () => void;
  series: DuelSeries;
  seriesStatus: DuelSeriesStatus;
}

export function DuelWaitingRoom({
  opponentName,
  stalled,
  onRetry,
  onBackToLobby,
  series,
  seriesStatus,
}: DuelWaitingRoomProps) {
  const { t } = useLanguage();

  return (
    <div
      data-testid="duel-waiting"
      data-stalled={stalled ? 'true' : 'false'}
      className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 bg-neo-navy px-4 text-center"
    >
      {/* The mascot waits with you rather than leaving you alone with a spinner. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a 104px static webp; next/image adds a loader round-trip to a screen that must paint instantly */}
      <img
        src="/mascot/waiting.webp"
        alt=""
        aria-hidden="true"
        width={120}
        height={120}
        className="h-[104px] w-[104px] object-contain drop-shadow-[4px_4px_0_rgba(0,0,0,0.55)]"
      />

      {!stalled && (
        <div className="flex items-center gap-3">
          <Loader size="lg" />
          <p className="font-neo-display text-lg font-black uppercase italic tracking-tight text-neo-cream">
            {t('education.duels.waitingForName', undefined, { name: opponentName })}
          </p>
        </div>
      )}

      {stalled && (
        <div
          data-testid="duel-waiting-recovery"
          className="w-full max-w-sm rounded-neo border-[3px] border-neo-cream bg-neo-navy p-4 shadow-hard"
        >
          <p className="font-neo-display text-xl font-black uppercase italic tracking-tight text-neo-cream">
            {t('education.duels.stillWaiting', undefined, { name: opponentName })}
          </p>
          <p className="mt-1 font-neo-body text-sm font-bold text-neo-cream/85">
            {t('education.duels.waitingHint')}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {/* One dominant primary: try again. Leaving is the quiet option. */}
            <button
              type="button"
              data-testid="duel-waiting-retry"
              onClick={onRetry}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-3',
                'font-neo-display text-base font-black uppercase italic tracking-tight text-neo-black shadow-hard',
                'transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed'
              )}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              {t('education.duels.tryAgain')}
            </button>

            <button
              type="button"
              data-testid="duel-waiting-exit"
              onClick={onBackToLobby}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy px-4 py-2.5',
                'font-neo-body text-sm font-black text-neo-cream shadow-hard-sm',
                'transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed'
              )}
            >
              <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
              {t('education.duels.backToLobby')}
            </button>
          </div>
        </div>
      )}

      {/* Mid-series, the stakes belong on screen before the board does. */}
      {series.games > 0 && <DuelSeriesTally series={series} status={seriesStatus} />}
    </div>
  );
}
