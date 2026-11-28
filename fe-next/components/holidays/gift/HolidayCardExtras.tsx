'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import { trackIndex, type HolidayKey, type HolidayWindow } from '@/lib/holidays/calendar';
import { COMEBACK_GAMES, lastMissedIndex } from '@/lib/holidays/comeback';
import { giftOpenable, giftTier, type GiftReward } from '@/lib/holidays/gift';
import {
  HOLIDAY_HUNT_EVENT, celebrateHolidayEgg, holidayGet, holidayPost, loadHunt,
  type HolidayQuery, type HuntClientState,
} from '@/lib/holidays/holidayClient';
import type { HolidayProgressView } from '@/lib/holidayEvent/progressView';
import { cn } from '@/lib/utils';
import MysteryGift from './MysteryGift';
import '../holidayFx.css';
import { holidayAccentBg } from '@/components/holidays/holidayAccent';

const HolidayWrapped = dynamic(() => import('../wrapped/HolidayWrapped'), { ssr: false });

interface GiftServerState {
  opened: GiftReward | null;
  gamesToday: number;
  comebackUsed: boolean;
}

interface Props {
  holiday: HolidayKey;
  win: HolidayWindow;
  today: string;
  view: HolidayProgressView;
  locale: string;
}

const FULL_MENORAH = 44;

function ZotHanukkah() {
  const { t } = useLanguage();
  const { playStreakMilestoneSound } = useSoundEffects();
  const cheer = () => {
    playStreakMilestoneSound();
    void import('@/utils/confettiUtils').then(({ fireConfetti }) => fireConfetti({ particleCount: 160, spread: 110, disableForReducedMotion: true }));
  };
  return (
    <button
      type="button"
      data-testid="holiday-zot"
      onClick={cheer}
      className="holiday-pop-in flex items-center gap-3 rounded-xl border-[3px] border-black bg-neo-holiday-blue p-2 text-start text-neo-white shadow-hard-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/holidays/props-menorah.webp" alt="" width={48} height={48} className="holiday-chime size-12 object-contain" />
      <span>
        <span className="block font-neo-display text-sm font-bold">{t('holiday.eggs.zotTitle')}</span>
        <span className="block text-xs">{t('holiday.eggs.zotBody')}</span>
      </span>
    </button>
  );
}

function DreidelEgg() {
  const { t } = useLanguage();
  const { region } = useHoliday();
  const { playWheelSpinSound } = useSoundEffects();
  const [spin, setSpin] = useState(false);
  const [said, setSaid] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={t('holiday.eggs.dreidelLabel')}
        onClick={() => {
          playWheelSpinSound();
          setSpin(true);
          setSaid(true);
          celebrateHolidayEgg('dreidel_pe');
        }}
        onAnimationEnd={() => setSpin(false)}
        className={cn('size-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream', spin && 'holiday-mascot-spin')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holidays/peek-dreidel.webp" alt="" width={36} height={36} className="size-full object-contain" />
      </button>
      {said && (
        <span role="status" className="holiday-pop-in absolute bottom-full end-0 mb-1 whitespace-nowrap rounded-lg border-2 border-black bg-neo-cream px-2 py-1 text-[11px] font-bold text-neo-navy shadow-hard-sm">
          {t(region === 'IL' ? 'holiday.eggs.dreidelIL' : 'holiday.eggs.dreidelWorld')}
        </span>
      )}
    </span>
  );
}

export default function HolidayCardExtras({ holiday, win, today, view, locale }: Props) {
  const { t } = useLanguage();
  const [gift, setGift] = useState<GiftServerState | null>(null);
  const [giftError, setGiftError] = useState(false);
  const [giftTick, setGiftTick] = useState(0);
  const [hunt, setHunt] = useState<HuntClientState | null>(null);
  const [wrapped, setWrapped] = useState(false);
  const q: HolidayQuery = { holiday, localDate: today, locale };
  const litCount = view.days.filter((d) => d.lit).length;
  const lit = new Set(view.days.filter((d) => d.lit).map((d) => d.index));
  const todayIdx = trackIndex(win, today);
  const missed = today < win.trackDays[0] ? null : lastMissedIndex(lit, todayIdx, win.trackDays.length);
  const openable = giftOpenable(win, today);
  const qsKey = `${holiday}|${today}|${locale}`;

  useEffect(() => {
    let alive = true;
    holidayGet<GiftServerState>('gift', q)
      .then((g) => {
        if (!alive) return;
        setGift(g);
        setGiftError(false);
      })
      .catch(() => alive && setGiftError(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey, litCount, giftTick]);

  useEffect(() => {
    let alive = true;
    void loadHunt().then((h) => alive && setHunt(h));
    const onHunt = (e: Event) => setHunt((e as CustomEvent<HuntClientState>).detail);
    window.addEventListener(HOLIDAY_HUNT_EVENT, onHunt);
    return () => {
      alive = false;
      window.removeEventListener(HOLIDAY_HUNT_EVENT, onHunt);
    };
  }, [qsKey]);

  const onOpen = useCallback(async () => {
    try {
      const res = await holidayPost<{ status: string; reward?: GiftReward }>('gift', q);
      return res.reward ?? null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey]);

  const candles = view.days.reduce((n, d) => (d.lit ? n + d.index + 2 : n), 0);
  const zot = holiday === 'hanukkah' && today === win.finale;

  const titles = [
    ...view.days.flatMap((d) => (d.lit && d.reward.title ? [d.reward.title] : [])),
    ...(hunt?.seeker ? ['seeker'] : []),
  ];

  return (
    <div data-testid="holiday-card-extras" className="mt-3 flex flex-col gap-2">
      {zot && <ZotHanukkah />}
      {giftError && !gift && (
        <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-neo-navy p-2 text-xs">
          <span>{t('holiday.event.loadError')}</span>
          <button type="button" onClick={() => setGiftTick((n) => n + 1)} className="rounded-lg border-2 border-black bg-neo-cream px-2 py-1 font-bold text-neo-navy">
            {t('holiday.event.retry')}
          </button>
        </div>
      )}
      {gift && (
        <MysteryGift
          holiday={holiday}
          tier={giftTier(holiday, litCount)}
          openable={openable}
          opened={gift.opened}
          finale={win.finale}
          stalled={missed !== null}
          onOpen={onOpen}
        />
      )}

      {gift && missed !== null && !gift.comebackUsed && !openable && (
        <p data-testid="holiday-comeback" className="flex items-center gap-2 rounded-lg border-2 border-dashed border-neo-cream/60 px-2 py-1.5 text-xs">
          <span className="font-bold text-neo-cream tabular-nums">{Math.min(gift.gamesToday, COMEBACK_GAMES)}/{COMEBACK_GAMES}</span>
          <span>{t(`holiday.comeback.${holiday}`, { day: missed + 1, count: Math.max(0, COMEBACK_GAMES - gift.gamesToday) })}</span>
        </p>
      )}

      {hunt && (
        <p data-testid="holiday-hunt-hint" className="flex items-center gap-2 text-xs text-neo-white/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/holidays/gold-magnifier.webp" alt="" width={20} height={20} className="size-5 shrink-0 object-contain" />
          <span className="min-w-0 flex-1">{hunt.foundToday ? t('holiday.hunt.foundToday') : t(`holiday.hunt.hint.${hunt.slot}`)}</span>
          <span className="shrink-0 font-bold tabular-nums text-neo-cream">{t('holiday.hunt.progress', { count: hunt.count, goal: hunt.goal })}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {titles.map((id) => (
          <span key={id} data-testid="holiday-title-badge" className={cn('rounded-full border-2 border-black px-2 py-0.5 font-neo-display text-[11px] font-bold text-neo-white', holidayAccentBg(holiday))}>
            {t(`holiday.title.${id}`)}
          </span>
        ))}
        {holiday === 'hanukkah' && (
          <span data-testid="holiday-candles" className="text-[11px] font-bold tabular-nums text-neo-cream">
            {t('holiday.eggs.candles', { count: candles, total: FULL_MENORAH })}
          </span>
        )}
        {holiday === 'hanukkah' && <span className="ms-auto"><DreidelEgg /></span>}
      </div>

      {today >= win.finale && (
        <button
          type="button"
          onClick={() => setWrapped(true)}
          className="rounded-xl border-[3px] border-black bg-neo-pink px-3 py-2 font-neo-display text-sm font-bold text-neo-white shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {t('holiday.wrapped.cta')}
        </button>
      )}
      {wrapped && <HolidayWrapped holiday={holiday} query={q} onClose={() => setWrapped(false)} />}
    </div>
  );
}
