'use client';

import { memo, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Play, SkipForward, QrCode, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

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
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvResultsControls - Host controls bar at bottom of TV results
 * Shows start game button, players ready indicator, and QR code access
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

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-0 left-0 right-0 z-[70] bg-linear-to-t from-slate-900 via-slate-900/95 to-transparent pt-8 pb-6 px-6"
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            {/* Skip Button (only during animation) */}
            <div className="flex-1">
              {isAnimating && (
                <m.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Button
                    onClick={onSkip}
                    variant="outline"
                    className="bg-transparent border-2 border-neo-cream/50 text-neo-cream hover:bg-neo-cream/10"
                  >
                    <SkipForward className="w-5 h-5 me-2" />
                    {t('tvResults.skip')}
                  </Button>
                </m.div>
              )}
            </div>

            {/* Center: Main CTA */}
            <div className="flex items-center gap-4">
              {/* Players Ready Indicator */}
              {totalPlayers > 0 && (
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black',
                    allReady ? 'bg-neo-lime' : 'bg-neo-yellow'
                  )}
                >
                  <Users className="w-5 h-5 text-neo-black" />
                  <span className="font-black text-neo-black">
                    {playersReadyCount}/{totalPlayers}
                  </span>
                  <span className="font-bold text-neo-black/70 text-sm">
                    {t('tvResults.playersReady')}
                  </span>
                  {allReady && (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-lg"
                    >
                      🎉
                    </m.span>
                  )}
                </m.div>
              )}

              {/* Start New Game / Next Round Button */}
              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
              >
                <Button
                  onClick={showNextRound ? onNextRound : onStartNewGame}
                  disabled={continueDisabled}
                  className={cn(
                    'h-14 px-8 text-lg font-black uppercase',
                    'bg-neo-lime text-neo-black border-4 border-neo-black',
                    'shadow-hard-lg hover:shadow-hard-xl',
                    'hover:translate-x-[-3px] hover:translate-y-[-3px]',
                    'active:shadow-hard active:translate-x-px active:translate-y-px',
                    'transition-all',
                    continueDisabled && 'opacity-60 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 hover:shadow-hard-lg'
                  )}
                >
                  <Play className="w-6 h-6 me-2" />
                  {gateLocked
                    ? `${showNextRound ? t('tvResults.nextRound') : t('tvResults.startNewGame')} (${secondsLeft}s)`
                    : (showNextRound ? t('tvResults.nextRound') : t('tvResults.startNewGame'))}
                </Button>
              </m.div>
            </div>

            {/* QR Code Button */}
            <div className="flex-1 flex justify-end">
              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button
                  onClick={onShowQR}
                  variant="outline"
                  className="bg-transparent border-2 border-neo-cream/50 text-neo-cream hover:bg-neo-cream/10"
                >
                  <QrCode className="w-5 h-5 me-2" />
                  {t('tvResults.qrCode')}
                </Button>
              </m.div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsControls.displayName = 'TvResultsControls';

export default TvResultsControls;
