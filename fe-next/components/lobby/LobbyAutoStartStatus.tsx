'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useSocketOptional } from '@/utils/SocketContext';
import { useLobbyAutoStart } from '@/hooks/useLobbyAutoStart';

type TranslateFn = (path: string, params?: Record<string, string | number>) => string;

interface LobbyAutoStartStatusProps {
  /** Non-host humans the server reports as ready. */
  readyCount: number;
  /** Total non-host humans (eligible to ready up). */
  readyTotal: number;
  t: TranslateFn;
}

/**
 * The lobby status line ("N/M ready" / "host will start" / "starting in Ns").
 *
 * Extracted from PlayerWaitingView so the server-owned auto-start countdown
 * (`useLobbyAutoStart`, which setState's every second on `lobbyAutoStartTick`)
 * lives in this tiny memoized leaf instead of re-rendering the whole 8-avatar
 * lobby tree once per second. That 1Hz whole-view churn was the dominant cost
 * behind the /multiplayer INP regression — interactions (and the auth-status
 * paint) queued behind a main thread busy re-rendering the roster.
 *
 * Self-subscribes to the socket (no prop threading), matching the lobby's
 * existing self-contained-over-the-shared-socket pattern.
 */
function LobbyAutoStartStatusImpl({ readyCount, readyTotal, t }: LobbyAutoStartStatusProps): React.ReactElement {
  const socketCtx = useSocketOptional();
  const { secondsLeft: autoStartSecondsLeft } = useLobbyAutoStart({
    socket: socketCtx?.socket ?? null,
  });

  return (
    <div className="flex items-center justify-between gap-2 mt-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-neo-lime animate-pulse shrink-0" />
        <p className={cn(
          'text-sm truncate',
          autoStartSecondsLeft !== null ? 'text-neo-lime font-bold' : 'text-slate-400'
        )}>
          {autoStartSecondsLeft !== null
            ? t('playerView.autoStartingSoon', { seconds: autoStartSecondsLeft })
            : readyCount > 0
              ? `${readyCount}/${readyTotal} ${t('hostView.playersReady')}`
              : t('playerView.hostWillStart')}
        </p>
      </div>
    </div>
  );
}

export const LobbyAutoStartStatus = memo(LobbyAutoStartStatusImpl);
export default LobbyAutoStartStatus;
