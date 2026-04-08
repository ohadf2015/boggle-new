'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, SkipForward, QrCode, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
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
                <motion.div
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
                </motion.div>
              )}
            </div>

            {/* Center: Main CTA */}
            <div className="flex items-center gap-4">
              {/* Players Ready Indicator */}
              {totalPlayers > 0 && (
                <motion.div
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
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-lg"
                    >
                      🎉
                    </motion.span>
                  )}
                </motion.div>
              )}

              {/* Start New Game / Next Round Button */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
              >
                {showNextRound ? (
                  <Button
                    onClick={onNextRound}
                    className={cn(
                      'h-14 px-8 text-lg font-black uppercase',
                      'bg-neo-lime text-neo-black border-4 border-neo-black',
                      'shadow-hard-lg hover:shadow-hard-xl',
                      'hover:translate-x-[-3px] hover:translate-y-[-3px]',
                      'active:shadow-hard active:translate-x-px active:translate-y-px',
                      'transition-all'
                    )}
                  >
                    <Play className="w-6 h-6 me-2" />
                    {t('tvResults.nextRound')}
                  </Button>
                ) : (
                  <Button
                    onClick={onStartNewGame}
                    className={cn(
                      'h-14 px-8 text-lg font-black uppercase',
                      'bg-neo-lime text-neo-black border-4 border-neo-black',
                      'shadow-hard-lg hover:shadow-hard-xl',
                      'hover:translate-x-[-3px] hover:translate-y-[-3px]',
                      'active:shadow-hard active:translate-x-px active:translate-y-px',
                      'transition-all'
                    )}
                  >
                    <Play className="w-6 h-6 me-2" />
                    {t('tvResults.startNewGame')}
                  </Button>
                )}
              </motion.div>
            </div>

            {/* QR Code Button */}
            <div className="flex-1 flex justify-end">
              <motion.div
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
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

TvResultsControls.displayName = 'TvResultsControls';

export default TvResultsControls;
