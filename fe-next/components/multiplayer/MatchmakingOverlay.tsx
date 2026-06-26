'use client';

import { useRef } from 'react';
import type { MatchmakingOpponent, MatchmakingStatus } from '@/hooks/useMatchmaking';
import { getRankTier } from '@/shared/utils/eloRating';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { SilentVideo } from '@/components/ui/SilentVideo';

interface MatchmakingOverlayProps {
  status: MatchmakingStatus;
  elo: number;
  eloRange: number;
  queueSize: number;
  waitTime: number;
  opponent: MatchmakingOpponent | null;
  onCancel: () => void;
  onCreateRoom: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export function MatchmakingOverlay({
  status,
  elo,
  eloRange,
  queueSize,
  waitTime,
  opponent,
  onCancel,
  onCreateRoom,
  t,
}: MatchmakingOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, status !== 'idle', onCancel);

  if (status === 'idle') return null;

  const tier = getRankTier(elo);
  const minutes = Math.floor(waitTime / 60);
  const seconds = waitTime % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-label={t('matchmaking.findingOpponent')}
    >
      <div ref={dialogRef} className="mx-4 w-full max-w-md rounded-neo border-neo bg-neo-navy p-6 shadow-hard-lg">
        {status === 'searching' && (
          <div className="flex flex-col items-center gap-4">
            {/* Searching mascot */}
            <SilentVideo
              src="/mascot/spectating.webp"
              width={80}
              height={80}
              className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              preload="metadata"
              aria-hidden="true"
            />

            <h2 className="font-neo-display text-xl text-neo-white">
              {t('matchmaking.findingOpponent')}
            </h2>

            {/* ELO range */}
            <div className="text-center">
              <span
                className="font-neo-body text-lg"
                style={{ color: tier.color }}
              >
                {t('matchmaking.eloRange', { elo, range: eloRange })}
              </span>
            </div>

            {/* Queue info */}
            <div className="flex gap-4 text-sm text-neo-white">
              <span>
                {t('matchmaking.playersInQueue', { count: queueSize })}
              </span>
              <span>{t('matchmaking.estimatedWait', { time: timeStr })}</span>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="mt-4 rounded-neo border-neo bg-neo-red px-6 py-2 font-neo-body text-neo-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('matchmaking.cancel')}
            </button>
          </div>
        )}

        {status === 'found' && opponent && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="animate-neo-pop font-neo-display text-2xl text-neo-lime">
              {t('matchmaking.matchFound')}
            </h2>

            <div className="rounded-neo border-neo bg-neo-navy-light p-4 text-center">
              <p className="font-neo-display text-lg text-neo-white">
                {opponent.username}
              </p>
              <p
                className="font-neo-body text-sm"
                style={{ color: getRankTier(opponent.elo).color }}
              >
                {opponent.tier} — {opponent.elo}
              </p>
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="font-neo-display text-xl text-neo-white">
              {t('matchmaking.timeout')}
            </h2>

            <button
              type="button"
              onClick={onCreateRoom}
              className="rounded-neo border-neo bg-neo-pink px-6 py-3 font-neo-body text-neo-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('matchmaking.createRoom')}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-neo-white underline"
            >
              {t('matchmaking.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
