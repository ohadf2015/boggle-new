'use client';

import React, { memo, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Users } from 'lucide-react';
import { m } from 'framer-motion';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import { tvJoinAddress } from '../../../lib/education/tvJoinAddress';

interface TvJoinBarProps {
  gameCode: string;
  roomName?: string;
  playerCount: number;
  language: string;
  baseUrl?: string;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvJoinBar - Kahoot-style join bar for TV broadcast mode
 * Displays QR code, room code, and room name prominently
 */
const TvJoinBar = memo<TvJoinBarProps>(({
  gameCode,
  roomName,
  playerCount,
  language,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live',
  t,
}) => {
  // Generate join URL with locale prefix
  const joinUrl = useMemo(() => {
    return `${baseUrl}/${language}/join/${gameCode}`;
  }, [baseUrl, gameCode, language]);

  return (
    <m.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full bg-neo-purple border-b-4 border-neo-black relative z-40"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5">
        {/* Main row: Join info + Code + QR */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Join URL */}
          <div className="flex-1">
            <p className="text-neo-cream/80 text-sm font-bold uppercase tracking-wider mb-1">
              {t('tvBroadcast.joinAt')}
            </p>
            {/* The address must carry the code. A bare "lexiclash.live" has no
                game-code input anywhere on it, so a student who cannot scan the
                QR had the code and nowhere to type it. */}
            <p className="text-neo-cream text-xl md:text-2xl lg:text-3xl font-black tracking-wide break-all">
              {tvJoinAddress(baseUrl, language, gameCode)}
            </p>
          </div>

          {/* Center: Game Code (HUGE) */}
          <div className="shrink-0 text-center px-6">
            <p className="text-neo-cream/80 text-sm font-bold uppercase tracking-wider mb-1" id="game-code-label">
              {t('tvBroadcast.gameCode')}
            </p>
            <m.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="bg-neo-cream text-neo-purple px-6 py-2 rounded-neo border-4 border-neo-black shadow-hard"
              role="status"
              aria-labelledby="game-code-label"
            >
              <span className="text-5xl md:text-6xl lg:text-7xl font-black tracking-[0.15em] uppercase" aria-label={`Game code: ${gameCode.split('').join(' ')}`}>
                {gameCode}
              </span>
            </m.div>
          </div>

          {/* Right: QR Code */}
          <div className="flex-1 flex justify-end items-center gap-4">
            {/* Player Count */}
            <div className="text-right hidden md:block">
              <p className="text-neo-cream/80 text-sm font-bold uppercase tracking-wider mb-1">
                {t('tvBroadcast.players')}
              </p>
              <m.div
                key={playerCount}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 text-neo-cream"
                data-testid="player-count-wrapper"
              >
                <Users className="w-6 h-6" />
                <AnimatedCounter
                  value={playerCount}
                  className="text-3xl font-black text-neo-cream"
                  size="xl"
                  formatValue={(v) => String(Math.round(v))}
                />
              </m.div>
            </div>

            {/* QR Code */}
            <m.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-white p-2 rounded-lg border-3 border-neo-black shadow-hard-sm"
            >
              <QRCodeSVG
                value={joinUrl}
                size={80}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </m.div>
          </div>
        </div>

        {/* Room name subtitle (if provided) */}
        {roomName && (
          <div className="text-center mt-2">
            <p className="text-neo-cream/90 text-lg font-bold">
              &ldquo;{roomName}&rdquo;
            </p>
          </div>
        )}
      </div>
    </m.div>
  );
});

TvJoinBar.displayName = 'TvJoinBar';

export default TvJoinBar;
