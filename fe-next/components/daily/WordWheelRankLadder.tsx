import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown, ChevronUp, Crown, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { WHEEL_RANKS, rankProgress } from '@/lib/wordWheel/rankLadder';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface LadderRival {
  name: string;
  score: number;
  playerId?: string | null;
  customAvatar?: CustomAvatarConfig | null;
  avatarImage?: string | null;
}

type T = (key: string, params?: Record<string, string | number>) => string;

interface WordWheelRankLadderProps {
  t: T;
  score: number;
  thresholds: number[];
  rivals: LadderRival[];
  showRival?: boolean;
  /** bar = phone strip, wide = desktop hero strip, list = desktop side panel. */
  variant?: 'bar' | 'wide' | 'list';
}

const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

function nextRivalAbove(rivals: LadderRival[], score: number): LadderRival | null {
  return rivals.reduce<LadderRival | null>(
    (best, r) => (r.score > score && (best === null || r.score < best.score) ? r : best),
    null,
  );
}

function RivalAvatar({ rival, size }: { rival: LadderRival; size: number }) {
  return (
    <Avatar
      pixelSize={size}
      userId={rival.playerId ?? rival.name}
      customAvatar={rival.customAvatar ?? undefined}
      avatarImage={rival.avatarImage ?? undefined}
      className="rounded-full"
    />
  );
}

function RankList({ t, thresholds, index }: { t: T; thresholds: number[]; index: number }) {
  return (
    <ol data-testid="rank-list" className="flex flex-col-reverse gap-0.5">
      {WHEEL_RANKS.map((key, i) => {
        const current = i === index;
        return (
          <li
            key={key}
            aria-current={current ? 'true' : undefined}
            className={cn(
              'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm',
              current ? 'text-neo-black font-black' : i < index ? 'text-neo-lime/80 font-bold' : 'text-neo-white/55 font-semibold',
            )}
          >
            {current && (
              <m.span
                layoutId="rank-list-current"
                aria-hidden
                className="absolute inset-0 rounded-lg bg-neo-lime shadow-[0_0_14px_rgba(191,255,0,0.45)]"
                transition={SPRING}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative w-2 h-2 shrink-0',
                i === WHEEL_RANKS.length - 1 ? 'rounded-[2px]' : 'rounded-full',
                current ? 'bg-neo-black' : i < index ? 'bg-neo-lime' : 'bg-neo-white/25',
              )}
            />
            <span className="relative flex-1 truncate">{t(`wordWheel.rank.${key}`)}</span>
            <span className="relative tabular-nums">{thresholds[i]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function WordWheelRankLadder({
  t, score, thresholds, rivals, showRival = false, variant = 'bar',
}: WordWheelRankLadderProps) {
  const [open, setOpen] = useState(false);
  const { index, position, toNext } = rankProgress(score, thresholds);
  const last = thresholds.length - 1;
  const rankName = t(`wordWheel.rank.${WHEEL_RANKS[index]}`);
  const pct = `${position * 100}%`;
  const nextRival = showRival ? nextRivalAbove(rivals, score) : null;
  const rivalPos = nextRival ? rankProgress(nextRival.score, thresholds).position : 0;

  const prevIndexRef = useRef(index);
  const [rankUpKey, setRankUpKey] = useState(0);
  useEffect(() => {
    if (index > prevIndexRef.current) setRankUpKey(k => k + 1);
    prevIndexRef.current = index;
  }, [index]);

  if (variant === 'list') {
    return (
      <div data-testid="rank-ladder" data-rank-index={index} className="w-full flex flex-col gap-3">
        <span className="font-black text-neo-white text-sm uppercase tracking-wide">{t('wordWheel.rank.title')}</span>
        <RankList t={t} thresholds={thresholds} index={index} />
      </div>
    );
  }

  const wide = variant === 'wide';

  const track = (
    <div
      role="progressbar"
      aria-label={rankName}
      aria-valuemin={0}
      aria-valuemax={thresholds[last]}
      aria-valuenow={score}
      className={cn('relative flex-1 min-w-0', wide ? 'h-12' : 'h-9')}
    >
      <div className={cn('absolute top-1/2 -translate-y-1/2 rounded-full bg-neo-white/15', wide ? 'inset-x-6 h-1.5' : 'inset-x-4 h-[3px]')}>
        <m.div
          className="absolute inset-y-0 start-0 rounded-full bg-neo-lime shadow-[0_0_10px_rgba(191,255,0,0.6)]"
          initial={false}
          animate={{ width: pct }}
          transition={SPRING}
        />
        {thresholds.map((_, i) => (
          <span
            key={i}
            data-rank-dot={i <= index ? 'passed' : 'ahead'}
            aria-hidden
            className={cn(
              'absolute top-1/2 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 transition-colors duration-300',
              i === last ? (wide ? 'w-3.5 h-3.5 rounded-[3px]' : 'w-2.5 h-2.5 rounded-[2px]') : wide ? 'w-3 h-3 rounded-full' : 'w-2 h-2 rounded-full',
              i <= index ? 'bg-neo-lime' : 'bg-neo-white/30',
            )}
            style={{ insetInlineStart: `${(i / last) * 100}%` }}
          />
        ))}
        {nextRival && (
          <m.span
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 rounded-full ring-2 ring-neo-pink bg-neo-navy z-[1]"
            initial={false}
            animate={{ insetInlineStart: `${rivalPos * 100}%` }}
            transition={SPRING}
          >
            <RivalAvatar rival={nextRival} size={wide ? 26 : 18} />
          </m.span>
        )}
        <m.div
          className="absolute top-1/2 start-0 h-0 z-[2]"
          initial={false}
          animate={{ width: pct }}
          transition={SPRING}
        >
          {rankUpKey > 0 && (
            <m.span
              key={`burst-${rankUpKey}`}
              aria-hidden
              className={cn(
                'absolute end-0 top-1/2 -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2 rounded-full border-[3px] border-neo-lime pointer-events-none',
                wide ? 'w-12 h-12' : 'w-9 h-9',
              )}
              initial={{ scale: 0.6, opacity: 1 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            />
          )}
          <m.span
            key={score}
            data-testid="rank-bubble"
            className={cn(
              'absolute end-0 top-1/2 -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2 grid place-items-center rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black font-neo-display font-black tabular-nums shadow-[2px_2px_0_#000,0_0_16px_rgba(191,255,0,0.55)]',
              wide ? 'min-w-12 h-12 px-1.5 text-lg' : 'min-w-9 h-9 px-1 text-sm',
            )}
            initial={score > 0 ? { scale: 1.5 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          >
            {score}
          </m.span>
        </m.div>
      </div>
    </div>
  );

  const rankLabel = (
    <span className={cn('relative block overflow-hidden shrink-0', wide ? 'h-9 w-[180px]' : 'h-6 w-[96px]')}>
      <m.span
        key={index}
        data-testid="rank-name"
        className={cn(
          'absolute inset-0 flex items-center font-neo-display font-black text-neo-white truncate',
          wide ? 'text-[28px]' : 'text-[17px]',
        )}
        initial={index > 0 ? { y: '100%' } : false}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        {rankName}
      </m.span>
    </span>
  );

  return (
    <div data-testid="rank-ladder" data-rank-index={index} className="relative w-full z-30">
      <button
        type="button"
        aria-label={`${rankName}. ${t('wordWheel.rank.open')}`}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center text-start touch-manipulation', wide ? 'gap-4' : 'gap-2')}
      >
        {rankLabel}
        {track}
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-neo-white/50 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div className={cn('flex items-center justify-between gap-3 leading-none', wide ? 'h-6 text-sm' : 'h-5 text-xs')}>
        <span className="truncate text-neo-white/70 font-semibold">
          {toNext > 0
            ? t('wordWheel.rank.toNext', { count: toNext, rank: t(`wordWheel.rank.${WHEEL_RANKS[index + 1]}`) })
            : t('wordWheel.rank.top')}
        </span>
        {showRival && (
          <span
            data-testid="next-rival-slot"
            className="min-w-0 flex items-center justify-end gap-1 text-neo-pink font-bold whitespace-nowrap"
          >
            {nextRival ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t('wordWheel.pointsToPass', { count: nextRival.score - score, name: nextRival.name })}</span>
              </>
            ) : rivals.length > 0 ? (
              <>
                <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t('wordWheel.rank.top')}</span>
              </>
            ) : null}
          </span>
        )}
      </div>
      {open && (
        <div className="absolute top-full inset-x-0 mt-2 p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-neo-display font-black text-neo-white">{t('wordWheel.rank.title')}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('wordWheel.strip.close')}
              className="w-8 h-8 grid place-items-center rounded-full text-neo-white/70 hover:bg-neo-black/30"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <RankList t={t} thresholds={thresholds} index={index} />
        </div>
      )}
    </div>
  );
}
