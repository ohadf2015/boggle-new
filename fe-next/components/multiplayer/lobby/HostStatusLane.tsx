'use client';

import type { ReactNode } from 'react';
import { Bot, Zap } from 'lucide-react';
import { SoloPlayPrompt } from '@/host/components/pre-game/SoloPlayPrompt';
import { cn } from '@/lib/utils';
import styles from './lobby.module.css';

type T = (path: string, params?: Record<string, string | number>) => string;

export interface HostStatusLaneProps {
  t: T;
  /** Server-synced "everyone's ready" countdown, or null. */
  autoStartSecondsLeft: number | null;
  onCancelAutoStart?: () => void;
  /** Passive "adding bots in N…" countdown, or null. */
  botCountdown: number | null;
  onCancelBotCountdown: () => void;
  showSoloPrompt: boolean;
  onPlayVsBots: () => void;
  /** A player is mid rewarded-ad: Start is held. */
  adHold: boolean;
  className?: string;
}

const LANE = 'flex items-center gap-2 min-h-[calc(44px*var(--mp-u,1))] rounded-neo border-2 px-3 py-1.5 font-neo-display font-bold text-[length:calc(14px*var(--mp-u,1))]';

/**
 * ONE line of lobby status, newest-most-urgent wins (never a stack):
 * everyone-ready auto-start > bots-incoming countdown > solo rescue > ad hold.
 * Renders nothing when there is nothing to say.
 */
export function HostStatusLane({
  t, autoStartSecondsLeft, onCancelAutoStart, botCountdown, onCancelBotCountdown, showSoloPrompt, onPlayVsBots, adHold, className,
}: HostStatusLaneProps) {
  const cancel = (onPress: () => void, tone: string) => (
    <button
      type="button"
      onClick={onPress}
      className={cn('ms-auto shrink-0 h-8 px-3 rounded-neo border-2 text-xs uppercase', tone)}
    >
      {t('common.cancel')}
    </button>
  );

  let lane: ReactNode = null;
  if (autoStartSecondsLeft !== null) {
    lane = (
      <div role="status" aria-live="polite" className={cn(LANE, 'border-neo-black bg-neo-lime text-neo-black shadow-hard-sm')}>
        <Zap aria-hidden="true" className="w-4 h-4 shrink-0" />
        <span className="truncate">{t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}</span>
        {onCancelAutoStart && cancel(onCancelAutoStart, 'border-neo-black bg-neo-navy text-neo-lime')}
      </div>
    );
  } else if (botCountdown !== null) {
    lane = (
      <div role="status" aria-live="polite" className={cn(LANE, 'border-neo-orange/70 bg-neo-navy-light text-neo-orange')}>
        <Bot aria-hidden="true" className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {t('hostView.noOneYet')} {t('hostView.addingBots')} <span className="tabular-nums">{botCountdown}</span>…
        </span>
        {cancel(onCancelBotCountdown, 'border-neo-orange/70 text-neo-orange')}
      </div>
    );
  } else if (showSoloPrompt) {
    lane = <SoloPlayPrompt onPlayVsBots={onPlayVsBots} t={t} />;
  } else if (adHold) {
    lane = (
      <p role="status" className={cn(LANE, 'border-neo-cyan/50 bg-neo-navy-light text-neo-cyan font-neo-body font-normal text-xs')}>
        {t('hostView.adWatchHold')}
      </p>
    );
  }

  if (!lane) return null;
  return <div data-testid="host-status-lane" className={cn(styles.laneIn, className)}>{lane}</div>;
}
