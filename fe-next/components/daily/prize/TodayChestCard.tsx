'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gift, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { maxPrizeCoins, type DayPrizeClaimResponse, type DayPrizeKind } from '@/lib/daily/dayPrize';
import { DayPrizeReveal } from './DayPrizeReveal';
import { fetchOpenedToday, readOpenedPrize } from './dayPrizeStore';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { COSMETICS } from '@/lib/cosmetics';
import { isChestCosmeticDrop, isChestPartDrop } from '@/lib/avatar/chestDrops';
import { chestPartNameKey } from '@/lib/avatar/chestReveal';

export interface TodayChestProgress {
  wordWheel: boolean;
  /** Word Hunt solved (a lost hunt does not count). */
  wordHunt: boolean;
  wordTower: boolean;
  connections: boolean;
}

interface TodayChestCardProps {
  progress: TodayChestProgress;
  className?: string;
}

/** The box this progress opens: the bigger one once all four are done. */
export function todayChestKind(progress: TodayChestProgress): DayPrizeKind {
  return progress.wordTower && progress.connections ? 'perfect' : 'clear';
}

function openedToday(): DayPrizeClaimResponse | null {
  return readOpenedPrize('perfect') ?? readOpenedPrize('clear');
}

/** "H:MM" until the next UTC day, when a new chest comes. */
function untilNextChest(): string {
  const total = getSecondsUntilNextDaily();
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Today's one chest on the daily hub.
 *
 * Locked until Word Wheel and Word Hunt are done: it says what is left and has
 * no Open button. Then it opens with one tap; finishing both bonus puzzles
 * first makes it the bigger chest. Once open it shows what it held. Guests see
 * what signing in would get them.
 */
export function TodayChestCard({ progress, className }: TodayChestCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [opened, setOpened] = useState<DayPrizeClaimResponse | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [nextIn, setNextIn] = useState('');

  // Read after mount: the hub SSRs, and storage during render would mismatch hydration.
  // Then ask the server, so a chest opened on another device (or before this
  // device remembered it) never shows as waiting again.
  useEffect(() => {
    const local = openedToday();
    setOpened(local);
    if (local || !user) return undefined;
    let cancelled = false;
    void fetchOpenedToday().then((server) => {
      if (!cancelled && server) setOpened(server);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // The countdown to tomorrow's chest, once open.
  useEffect(() => {
    if (!opened) return undefined;
    setNextIn(untilNextChest());
    const timer = setInterval(() => setNextIn(untilNextChest()), 30_000);
    return () => clearInterval(timer);
  }, [opened]);

  const close = useCallback(() => {
    setRevealing(false);
    setOpened(openedToday());
  }, []);

  if (!user) {
    return (
      <p data-testid="today-chest-guest" className={cn('w-full text-center text-xs font-bold text-neo-cream', className)}>
        {t('daily.dayPrize.guestNudge', { coins: maxPrizeCoins('perfect') })}
      </p>
    );
  }

  const kind = todayChestKind(progress);
  const requiredLeft = [
    !progress.wordWheel && t('wordWheel.hub.wordWheelQuest'),
    !progress.wordHunt && t('daily.wordHunt.title'),
  ].filter(Boolean) as string[];
  const locked = requiredLeft.length > 0;

  if (opened) {
    const item = opened.part;
    const cosmetic = isChestCosmeticDrop(item) ? COSMETICS.find((c) => c.id === item.cosmeticId) : undefined;
    const itemName = cosmetic
      ? t(cosmetic.name)
      : isChestPartDrop(item) && !item.duplicate
        ? t(`revealUnlock.parts.${item.partId}`, t(chestPartNameKey(item)))
        : null;
    return (
      <div
        data-testid="today-chest-opened"
        data-tier={opened.tier}
        className={cn('w-full flex items-center gap-3 rounded-xl border-3 border-neo-black bg-neo-navy-light px-3 py-2.5 shadow-hard-sm', className)}
      >
        <span className="shrink-0 w-10 h-10 rounded-lg border-2 border-neo-black bg-neo-lime flex items-center justify-center" aria-hidden>
          <Gift className="w-5 h-5 text-neo-black" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-black leading-tight text-neo-white">
            {t('daily.todayChest.opened', { coins: opened.coins })}
            {opened.tier !== 'common' && <span className="text-neo-cyan"> · {t(`daily.dayPrize.tier.${opened.tier}`)}</span>}
          </span>
          {itemName && (
            <span data-testid="today-chest-item" className="mt-0.5 block text-xs font-bold text-neo-yellow truncate">+ {itemName}</span>
          )}
        </span>
        {nextIn && (
          <span
            data-testid="today-chest-next"
            className="shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black bg-neo-black px-2.5 py-1 text-[11px] font-black text-neo-cream tabular-nums"
          >
            {t('daily.todayChest.next', { time: nextIn })}
          </span>
        )}
      </div>
    );
  }

  const chestArt = (
    <span
      aria-hidden
      className={cn(
        'relative shrink-0 w-12 h-12 rounded-lg border-2 border-neo-black bg-cover bg-center',
        locked ? 'grayscale opacity-70' : 'animate-zap-wiggle motion-reduce:animate-none',
      )}
      style={{ backgroundImage: `url(/daily/chests/${kind === 'perfect' ? 'chest-gold' : 'chest-silver'}.jpg)` }}
    >
      {locked && (
        <span className="absolute -bottom-1.5 -end-1.5 w-6 h-6 rounded-full border-2 border-neo-black bg-neo-cream flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-neo-black" strokeWidth={3} />
        </span>
      )}
    </span>
  );

  if (locked) {
    const done = 2 - requiredLeft.length;
    return (
      <div
        data-testid="today-chest-locked"
        className={cn('w-full flex items-center gap-3 rounded-xl border-3 border-neo-black bg-neo-navy-light px-3 py-2.5 shadow-hard-sm', className)}
      >
        {chestArt}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-neo-white leading-tight">{t('daily.todayChest.title')}</p>
          <p data-testid="today-chest-todo" className="mt-0.5 text-xs font-bold text-neo-cream leading-snug">
            {t('daily.todayChest.locked', { modes: requiredLeft.join(t('daily.todayChest.and')) })}
          </p>
        </div>
        <span
          data-testid="today-chest-progress"
          className="shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black bg-neo-black px-2.5 py-1 text-xs font-black text-neo-cream tabular-nums"
        >
          {t('daily.todayChest.progress', { done, total: 2 })}
        </span>
      </div>
    );
  }

  const bonusLeft = Number(!progress.wordTower) + Number(!progress.connections);
  return (
    <>
      <button
        type="button"
        data-testid="today-chest-ready"
        data-kind={kind}
        onClick={() => setRevealing(true)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl border-3 border-neo-black bg-neo-yellow px-3 py-2.5 shadow-hard-sm text-start',
          'active:translate-y-0.5 active:shadow-none focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cream',
          className,
        )}
      >
        {chestArt}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-black leading-tight text-neo-black">
            {t(kind === 'perfect' ? 'daily.todayChest.readyBig' : 'daily.todayChest.ready')}
          </span>
          {kind === 'clear' && bonusLeft > 0 && (
            <span data-testid="today-chest-upgrade" className="mt-0.5 block text-xs font-bold leading-snug text-neo-black/75">
              {t('daily.todayChest.upgradeHint')}
            </span>
          )}
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black bg-neo-black px-3 py-1 text-xs font-black uppercase text-neo-yellow">
          {t('daily.dayPrize.open')}
        </span>
      </button>
      {revealing && <DayPrizeReveal kind={kind} source="hub" onClose={close} />}
    </>
  );
}

export default TodayChestCard;
