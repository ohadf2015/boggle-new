'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { giftHintIndex, type GiftReward } from '@/lib/holidays/gift';
import { cn } from '@/lib/utils';
import '../holidayFx.css';

interface Props {
  holiday: HolidayKey;
  tier: number;
  openable: boolean;
  opened: GiftReward | null;
  finale: string;
  stalled: boolean;
  onOpen: () => Promise<GiftReward | null>;
}

type Phase = 'closed' | 'opening' | 'error';

function formatDay(date: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  } catch {
    return date;
  }
}

function burst() {
  void import('@/utils/confettiUtils').then(({ fireConfetti }) =>
    fireConfetti({ particleCount: 140, spread: 90, startVelocity: 42, origin: { y: 0.55 }, disableForReducedMotion: true }),
  );
}

export function RewardLine({ reward }: { reward: GiftReward }) {
  const { t } = useLanguage();
  return (
    <div data-testid="mystery-gift-reward" className="holiday-pop-in flex flex-wrap items-center justify-center gap-1.5 font-neo-display text-sm font-bold">
      <span className="rounded-full border-2 border-black bg-neo-holiday-gold px-2 py-0.5 text-neo-navy">{t('holiday.reward.coins', { count: reward.coins })}</span>
      {reward.partKey && (
        <span className="rounded-full border-2 border-black bg-neo-cream px-2 py-0.5 text-neo-navy">
          {t(`holiday.part.${reward.partKey.slice(reward.partKey.indexOf(':') + 1)}`)}
        </span>
      )}
    </div>
  );
}

export default function MysteryGift({ holiday, tier, openable, opened, finale, stalled, onOpen }: Props) {
  const { t, language } = useLanguage();
  const { playBoardShuffleSound, playChestOpenSound, playGiftReceivedSound } = useSoundEffects();
  const [taps, setTaps] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [phase, setPhase] = useState<Phase>('closed');
  const [reward, setReward] = useState<GiftReward | null>(opened);
  const prevTier = useRef(tier);
  const [grew, setGrew] = useState(false);

  useEffect(() => setReward(opened), [opened]);

  useEffect(() => {
    if (tier > prevTier.current) {
      setGrew(true);
      playGiftReceivedSound();
    }
    prevTier.current = tier;
  }, [tier, playGiftReceivedSound]);

  const shake = () => {
    playBoardShuffleSound();
    setTaps((n) => n + 1);
    setShaking(true);
  };

  const open = async () => {
    setPhase('opening');
    playChestOpenSound();
    const r = await onOpen();
    if (!r) {
      setPhase('error');
      return;
    }
    setReward(r);
    setPhase('closed');
    playGiftReceivedSound();
    burst();
  };

  const img = `/holidays/gift-tier-${tier}.webp`;

  if (reward) {
    return (
      <div data-testid="mystery-gift" data-state="opened" className="flex flex-col items-center gap-2 rounded-xl border-2 border-black bg-neo-navy p-3 text-center">
        <p className="font-neo-display text-sm font-bold text-neo-holiday-gold">{t('holiday.gift.openedTitle')}</p>
        <RewardLine reward={reward} />
      </div>
    );
  }

  return (
    <div data-testid="mystery-gift" data-state={openable ? 'ready' : 'locked'} className="flex items-center gap-3 rounded-xl border-2 border-black bg-neo-navy p-3">
      <button
        type="button"
        aria-label={t(openable ? 'holiday.gift.open' : 'holiday.gift.shakeLabel')}
        onClick={openable ? open : shake}
        disabled={phase === 'opening'}
        onAnimationEnd={() => {
          setShaking(false);
          setGrew(false);
        }}
        className={cn(
          'relative size-20 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-holiday-gold',
          phase === 'opening' ? 'holiday-gift-burst' : shaking ? 'holiday-gift-shake' : grew ? 'holiday-gift-grow' : 'holiday-gift-idle',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-testid="mystery-gift-img" src={img} alt="" width={80} height={80} className="size-full object-contain drop-shadow-[3px_3px_0_var(--neo-black)]" />
      </button>
      <div className="min-w-0 flex-1 text-start">
        <p className="font-neo-display text-sm font-bold leading-tight">{t(`holiday.gift.${holiday}.title`)}</p>
        <p aria-live="polite" className="mt-0.5 text-xs text-neo-white/75">
          {phase === 'error'
            ? t('holiday.gift.openError')
            : taps > 0
              ? t(`holiday.gift.${holiday}.hint.${giftHintIndex(taps - 1)}`)
              : stalled
                ? t('holiday.gift.stalled')
                : t('holiday.gift.grows')}
        </p>
        {openable ? (
          <button
            type="button"
            onClick={open}
            disabled={phase === 'opening'}
            className="mt-2 rounded-lg border-2 border-black bg-neo-holiday-gold px-3 py-1 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm holiday-chime active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {t('holiday.gift.openCta')}
          </button>
        ) : (
          <p className="mt-1 text-[11px] font-bold text-neo-holiday-gold">{t('holiday.gift.opensOn', { day: formatDay(finale, language) })}</p>
        )}
      </div>
    </div>
  );
}
