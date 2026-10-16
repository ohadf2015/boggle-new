'use client';

import { memo, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Play, SkipForward, QrCode, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import TvResultsReadyStrip, { type ReadyPlayer } from './TvResultsReadyStrip';

const MIN_WAIT_MS = 15_000;

interface TvResultsControlsProps {
  visible: boolean;
  isAnimating: boolean;
  isTournament: boolean;
  isLastRound: boolean;
  playersReadyCount: number;
  totalPlayers: number;
  onSkip: () => void;
  onStartNewGame: () => void;
  onNextRound: () => void;
  onShowQR: () => void;
  /** Every player with their ready state; when present the dock shows faces instead of a bare count. */
  readyPlayers?: ReadyPlayer[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvResultsControls - Host controls bar at bottom of TV results
 * In normal flow (not fixed) so the stage above it is never painted underneath.
 */
const TvResultsControls = memo<TvResultsControlsProps>(({
  visible,
  isAnimating,
  isTournament,
  isLastRound,
  playersReadyCount,
  totalPlayers,
  onSkip,
  onStartNewGame,
  onNextRound,
  onShowQR,
  readyPlayers,
  t,
}) => {
  const allReady = playersReadyCount === totalPlayers && totalPlayers > 0;
  const showNextRound = isTournament && !isLastRound;

  // Minimum 15s gate from when controls become visible — prevents
  // accidentally skipping past the score reveal even if everyone is ready.
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(MIN_WAIT_MS / 1000));
  useEffect(() => {
    if (!visible) {
      setSecondsLeft(Math.ceil(MIN_WAIT_MS / 1000));
      return;
    }
    const startedAt = Date.now();
    const tick = () => {
      const left = Math.max(0, Math.ceil((MIN_WAIT_MS - (Date.now() - startedAt)) / 1000));
      setSecondsLeft(left);
      if (left === 0 && interval) clearInterval(interval);
    };
    const interval: ReturnType<typeof setInterval> | null = setInterval(tick, 250);
    tick();
    return () => { if (interval) clearInterval(interval); };
  }, [visible]);
  const gateLocked = secondsLeft > 0;
  // Unlock when EITHER all players ready OR 15s elapsed.
  const continueDisabled = gateLocked && !(totalPlayers > 0 && allReady);

  const ctaLabel = showNextRound ? t('tvResults.nextRound') : t('tvResults.startNewGame');

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          data-testid="tv-results-dock"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-[70] shrink-0 border-t-4 border-neo-black bg-neo-navy-light px-6 py-3"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6">
            <div className="flex min-w-0 items-center gap-4">
              {isAnimating && (
                <Button
                  onClick={onSkip}
                  variant="outline"
                  className="shrink-0 border-3 border-neo-cream/60 bg-neo-navy font-black uppercase text-neo-cream hover:bg-neo-navy-elevated"
                >
                  <SkipForward className="me-2 h-5 w-5" />
                  {t('tvResults.skip')}
                </Button>
              )}
              {readyPlayers && readyPlayers.length > 0 ? (
                <TvResultsReadyStrip players={readyPlayers} t={t} />
              ) : totalPlayers > 0 && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-neo border-3 border-neo-black px-4 py-2',
                    allReady ? 'bg-neo-lime' : 'bg-neo-yellow'
                  )}
                >
                  <Users className="h-5 w-5 text-neo-black" />
                  <span className="font-black text-neo-black">{playersReadyCount}/{totalPlayers}</span>
                  <span className="text-sm font-bold text-neo-black/70">{t('tvResults.playersReady')}</span>
                </div>
              )}
            </div>

            <Button
              onClick={showNextRound ? onNextRound : onStartNewGame}
              disabled={continueDisabled}
              className={cn(
                'h-16 px-10 font-neo-display text-2xl font-black uppercase',
                'border-4 border-neo-black bg-neo-lime text-neo-black shadow-hard-lg',
                'hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-hard-xl',
                'active:translate-x-px active:translate-y-px active:shadow-hard',
                'transition-transform',
                continueDisabled && 'cursor-not-allowed opacity-60 hover:translate-x-0 hover:translate-y-0 hover:shadow-hard-lg'
              )}
            >
              <Play className="me-3 h-7 w-7" />
              {gateLocked ? `${ctaLabel} (${secondsLeft}s)` : ctaLabel}
            </Button>

            <div className="flex justify-end">
              <Button
                onClick={onShowQR}
                variant="outline"
                className="h-12 border-3 border-neo-cream/60 bg-neo-navy px-5 font-black uppercase text-neo-cream hover:bg-neo-navy-elevated"
              >
                <QrCode className="me-2 h-6 w-6" />
                {t('tvResults.qrCode')}
              </Button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsControls.displayName = 'TvResultsControls';

export default TvResultsControls;
