'use client';

import { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame, Crosshair } from 'lucide-react';
import CircularTimer from '../../../components/CircularTimer';
import { tvModeLabel } from '../../../lib/tvBroadcast/modeLabel';

type UrgencyLevel = 'normal' | 'urgent' | 'critical' | 'extreme';

interface TvGameHeaderProps {
  remainingTime: number | null;
  timerValue: number; // in minutes
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  urgencyLevel?: UrgencyLevel;
  gameMode?: string | null;
  wordHuntTargetLength?: number;
  wordHuntAliveCount?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const HEARTBEAT_DURATION: Record<UrgencyLevel, number> = {
  normal: 0,
  urgent: 1,
  critical: 0.5,
  extreme: 0.15,
};

const MODE_COLORS: Record<string, string> = {
  classic: 'bg-neo-cyan text-neo-black',
  blast: 'bg-neo-orange text-neo-black',
  'word-hunt': 'bg-neo-pink text-neo-cream',
};

/**
 * TvGameHeader - Game header for TV broadcast mode
 * Shows LIVE badge, large timer with heartbeat pulse, game mode, and fire round indicator
 */
const TvGameHeader = memo<TvGameHeaderProps>(({
  remainingTime,
  timerValue,
  fireRoundActive = false,
  fireRoundRemaining = 0,
  earthquakeState = 'idle',
  urgencyLevel = 'normal',
  gameMode,
  wordHuntTargetLength = 0,
  wordHuntAliveCount = 0,
  t,
}) => {
  const totalTimeSeconds = timerValue * 60;
  const showHeartbeat = urgencyLevel !== 'normal';

  return (
    <div className="w-full px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: LIVE badge + Mode badge */}
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          <m.div
            data-testid="live-badge"
            className="flex items-center gap-2 bg-neo-red text-neo-cream px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
            animate={{
              boxShadow: [
                '4px 4px 0 rgba(0,0,0,1), 0 0 0px rgba(239,68,68,0)',
                '4px 4px 0 rgba(0,0,0,1), 0 0 12px rgba(239,68,68,0.6)',
                '4px 4px 0 rgba(0,0,0,1), 0 0 0px rgba(239,68,68,0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            role="status"
            aria-live="polite"
            aria-label={t('tvBroadcast.liveGameInProgress')}
          >
            {/* Pulsing recording dot */}
            <m.div
              data-testid="live-recording-dot"
              className="w-3 h-3 rounded-full bg-neo-cream"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
            <span className="font-black text-lg uppercase tracking-wider">{t('tvBroadcast.live')}</span>
          </m.div>

          {/* Game Mode Badge */}
          {gameMode && (
            <m.div
              data-testid="mode-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`px-3 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm font-bold text-sm uppercase ${MODE_COLORS[gameMode] || 'bg-neo-navy text-neo-cream'}`}
            >
              {tvModeLabel(gameMode, t)}
            </m.div>
          )}
        </m.div>

        {/* Center: Timer with heartbeat pulse */}
        <div className="flex-1 flex justify-center">
          {remainingTime !== null && (
            showHeartbeat ? (
              <m.div
                data-testid="timer-heartbeat"
                data-urgency={urgencyLevel}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: HEARTBEAT_DURATION[urgencyLevel],
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={urgencyLevel === 'extreme' ? 'rounded-full ring-4 ring-red-500/60' : ''}
              >
                <CircularTimer
                  remainingTime={remainingTime}
                  totalTime={totalTimeSeconds}
                  size="lg"
                />
              </m.div>
            ) : (
              <CircularTimer
                remainingTime={remainingTime}
                totalTime={totalTimeSeconds}
                size="lg"
              />
            )
          )}
        </div>

        {/* Right: Fire Round / Earthquake indicator */}
        <div className="flex items-center gap-3">
          {/* Earthquake Warning */}
          <AnimatePresence>
            {earthquakeState === 'warning' && (
              <m.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 10 }}
                className="bg-neo-orange text-neo-black px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
              >
                <m.span
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  className="font-black text-lg uppercase"
                >
                  {t('tvBroadcast.earthquake')}
                </m.span>
              </m.div>
            )}
          </AnimatePresence>

          {/* Fire Round Badge (Classic mode) */}
          <AnimatePresence>
            {fireRoundActive && (
              <m.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 3 }}
                exit={{ scale: 0, rotate: 10 }}
                className="flex items-center gap-2 bg-linear-to-r from-neo-orange to-neo-red text-neo-cream px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
                style={{
                  animation: 'fire-glow 1s ease-in-out infinite',
                }}
              >
                <Flame className="w-6 h-6 animate-bounce" />
                <div className="text-center">
                  <span className="font-black text-lg uppercase block">{t('tvBroadcast.fireRound')}</span>
                  <span className="text-xs font-bold">{t('tvBroadcast.twoXPoints')} • {fireRoundRemaining}s</span>
                </div>
                <Flame className="w-6 h-6 animate-bounce" />
              </m.div>
            )}
          </AnimatePresence>

          {/* Word Hunt Target + Alive Count */}
          {gameMode === 'word-hunt' && wordHuntTargetLength > 0 && (
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 bg-neo-pink text-neo-cream px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
            >
              <Crosshair className="w-5 h-5" />
              <div className="text-center">
                <span className="font-black text-sm uppercase block">
                  {t('tvBroadcast.targetLength')}: {wordHuntTargetLength} {t('tvBroadcast.letters')}
                </span>
                <span className="text-xs font-bold opacity-80">
                  {wordHuntAliveCount} {t('tvBroadcast.playersAlive')}
                </span>
              </div>
            </m.div>
          )}
        </div>
      </div>
    </div>
  );
});

TvGameHeader.displayName = 'TvGameHeader';

export default TvGameHeader;
