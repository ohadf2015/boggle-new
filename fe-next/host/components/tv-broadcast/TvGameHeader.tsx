'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Crosshair, Zap } from 'lucide-react';
import CircularTimer from '../../../components/CircularTimer';

type UrgencyLevel = 'normal' | 'urgent' | 'critical' | 'extreme';

interface TvGameHeaderProps {
  remainingTime: number | null;
  timerValue: number; // in minutes
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  urgencyLevel?: UrgencyLevel;
  gameMode?: string | null;
  blastWave?: number;
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

const MODE_KEYS: Record<string, string> = {
  classic: 'tvBroadcast.modeClassic',
  blast: 'tvBroadcast.modeBlast',
  'word-hunt': 'tvBroadcast.modeWordHunt',
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
  blastWave = 1,
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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          <motion.div
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
            <motion.div
              data-testid="live-recording-dot"
              className="w-3 h-3 rounded-full bg-neo-cream"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
            <span className="font-black text-lg uppercase tracking-wider">{t('tvBroadcast.live')}</span>
          </motion.div>

          {/* Game Mode Badge */}
          {gameMode && (
            <motion.div
              data-testid="mode-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`px-3 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm font-bold text-sm uppercase ${MODE_COLORS[gameMode] || 'bg-neo-navy text-neo-cream'}`}
            >
              {t(MODE_KEYS[gameMode] || `tvBroadcast.mode.${gameMode}`)}
            </motion.div>
          )}
        </motion.div>

        {/* Center: Timer with heartbeat pulse */}
        <div className="flex-1 flex justify-center">
          {remainingTime !== null && (
            showHeartbeat ? (
              <motion.div
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
              </motion.div>
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
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 10 }}
                className="bg-neo-orange text-neo-black px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
              >
                <motion.span
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  className="font-black text-lg uppercase"
                >
                  {t('tvBroadcast.earthquake')}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fire Round Badge (Classic mode) */}
          <AnimatePresence>
            {fireRoundActive && (
              <motion.div
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blast Wave Badge */}
          {gameMode === 'blast' && blastWave > 0 && (
            <motion.div
              key={`wave-${blastWave}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 bg-neo-orange text-neo-black px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
            >
              <Zap className="w-5 h-5" />
              <span className="font-black text-lg uppercase">
                {t('tvBroadcast.blastWave', { wave: blastWave })}
              </span>
            </motion.div>
          )}

          {/* Word Hunt Target + Alive Count */}
          {gameMode === 'word-hunt' && wordHuntTargetLength > 0 && (
            <motion.div
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
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
});

TvGameHeader.displayName = 'TvGameHeader';

export default TvGameHeader;
