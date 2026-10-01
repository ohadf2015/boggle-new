'use client';

import { Check, LogOut, Share2, X } from 'lucide-react';
import { MpPrimaryCta } from '../shell/MpPrimaryCta';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import fx from './mpResults.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface AutoRingProps {
  secondsLeft: number;
  total: number;
  onCancel: () => void;
  t: TFn;
}

const R = 20;
const C = 2 * Math.PI * R;

/** 10s auto-advance ring: tap to stop it. One stroke step per second (no rAF). */
export function MpAutoRing({ secondsLeft, total, onCancel, t }: AutoRingProps) {
  const urgent = secondsLeft <= 3;
  return (
    <button
      type="button"
      onClick={onCancel}
      data-testid="mp-auto-ring"
      aria-label={`${t('mpUi.results.autoIn', { seconds: secondsLeft })} — ${t('mpUi.results.cancelAuto')}`}
      className="group relative shrink-0 grid place-items-center rounded-full bg-neo-navy-light border-[3px] border-neo-black shadow-hard-sm w-[calc(64px*var(--mp-u,1))] h-[calc(64px*var(--mp-u,1))]"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" strokeWidth="4" className="stroke-neo-white/15" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - secondsLeft / total)}
          className={cn(fx.ringArc, urgent ? 'stroke-neo-pink' : 'stroke-neo-lime')}
        />
      </svg>
      <span key={secondsLeft} className={cn('relative font-neo-display font-bold tabular-nums text-[calc(22px*var(--mp-u,1))] group-hover:hidden', urgent ? 'text-neo-pink' : 'text-neo-white', fx.tick)}>
        {secondsLeft}
      </span>
      <X aria-hidden="true" className="relative hidden group-hover:block w-5 h-5 text-neo-white" />
    </button>
  );
}

export interface MpIntermissionFooterProps {
  isHost: boolean;
  isClassroom: boolean;
  isReady: boolean;
  ready: number;
  total: number;
  auto: { active: boolean; secondsLeft: number; total: number; cancel: () => void } | null;
  /** Someone in the room is mid-ad: START holds so the watcher isn't torn out. */
  adHold?: boolean;
  onStart: () => void;
  onReady: () => void;
  /** A classroom student's view of the game the teacher switched the room to. */
  nextModeLabel?: string;
  t: TFn;
}

/** Between rounds: [auto ring] [START NEXT (host) | I'M IN (joiner)] + ready status. */
export function MpIntermissionFooter({ isHost, isClassroom, isReady, ready, total, auto, adHold = false, onStart, onReady, nextModeLabel, t }: MpIntermissionFooterProps) {
  const status = total > 0 ? t('mpUi.results.readyCount', { ready, total }) : undefined;
  if (isClassroom && !isHost) {
    return (
      <p role="status" data-testid="mp-teacher-paced" className="px-4 py-3 text-center font-neo-display font-bold text-neo-white/90">
        {nextModeLabel && (
          <span className={cn('mb-1 inline-block rounded-full border-2 border-neo-black bg-neo-cyan px-3 py-0.5 text-sm uppercase tracking-wide text-neo-black shadow-hard-sm', fx.stamp)}>
            {t('eduStudent.results.nextUp', { mode: nextModeLabel })}
          </span>
        )}
        <span className="block">{t('mpUi.results.teacherPaced')}</span>
      </p>
    );
  }
  return (
    <div className="flex items-center gap-[calc(10px*var(--mp-u,1))]">
      {auto?.active && <MpAutoRing secondsLeft={auto.secondsLeft} total={auto.total} onCancel={auto.cancel} t={t} />}
      {isHost ? (
        <MpPrimaryCta
          tone="lime"
          label={t('mpUi.results.startNext')}
          sublabel={adHold ? t('hostView.adWatchHold') : status}
          onPress={onStart}
          disabled={adHold}
          className="flex-1 min-w-0"
        />
      ) : isReady ? (
        <MpPrimaryCta tone="cyan" label={t('mpUi.results.youreReady')} sublabel={t('mpUi.results.waitingHost')} onPress={() => {}} disabled className="flex-1 min-w-0 disabled:opacity-100" />
      ) : (
        <MpPrimaryCta tone="lime" label={t('mpUi.results.ready')} sublabel={status} onPress={onReady} className="flex-1 min-w-0" />
      )}
      {!isHost && isReady && (
        <Check aria-hidden="true" className={cn('shrink-0 w-8 h-8 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black p-1', fx.stamp)} />
      )}
    </div>
  );
}

export interface MpFinalFooterProps {
  isHost: boolean;
  isReady: boolean;
  onRematch: () => void;
  onLeave: () => void;
  onShare: () => void;
  /** Exit label key; a classroom host's exit goes back to class. */
  leaveKey?: string;
  t: TFn;
}

/** Final results: [REMATCH] [LEAVE] [share]. One primary; the rest are quiet. */
export function MpFinalFooter({ isHost, isReady, onRematch, onLeave, onShare, leaveKey = 'mpUi.results.leave', t }: MpFinalFooterProps) {
  const quiet = 'shrink-0 inline-flex flex-col items-center justify-center gap-0.5 rounded-neo border-[3px] border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm font-bold uppercase w-[calc(64px*var(--mp-u,1))] h-[calc(64px*var(--mp-u,1))] text-[calc(10px*var(--mp-u,1))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';
  return (
    <div className="flex items-center gap-[calc(10px*var(--mp-u,1))]">
      {!isHost && isReady ? (
        <MpPrimaryCta tone="cyan" label={t('mpUi.results.youreReady')} sublabel={t('mpUi.results.waitingHost')} onPress={() => {}} disabled className="flex-1 min-w-0 disabled:opacity-100" />
      ) : (
        <MpPrimaryCta tone="lime" label={t('mpUi.results.rematch')} sublabel={isHost ? t('mpUi.results.newSeries') : undefined} onPress={onRematch} className="flex-1 min-w-0" />
      )}
      <button type="button" data-testid="mp-results-leave" onClick={onLeave} className={cn(quiet, leaveKey !== 'mpUi.results.leave' && 'w-auto px-3')}>
        <DirectionalIcon icon={LogOut} mirror className="w-5 h-5" />
        {t(leaveKey)}
      </button>
      <button type="button" data-testid="mp-results-share" onClick={onShare} className={cn(quiet, 'bg-neo-pink text-neo-black')}>
        <Share2 aria-hidden="true" className="w-5 h-5" />
        {t('mpUi.results.share')}
      </button>
    </div>
  );
}
