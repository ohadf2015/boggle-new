'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import { localDateIn } from '@/lib/holidays/calendar';
import { celebrateHolidayEgg } from '@/lib/holidays/holidayClient';
import { momentsFor } from '@/lib/holidays/moments';
import { cn } from '@/lib/utils';
import { SNOWBALL_EVENT, SNOWGLOBE_EVENT, emitHolidayFx } from './eggEvents';
import '../holidayFx.css';

const TAP_GOAL = { hanukkah: 8, christmas: 12 } as const;
const TAP_GAP_MS = 1500;
const LONG_PRESS_MS = 2000;
const MOMENT_MASCOT = { lucia: '/holidays/m-lucia.webp', reyes: '/holidays/m-reyes.webp', dedmoroz: '/holidays/m-dedmoroz.webp' } as const;

interface Props {
  className?: string;
  children: ReactNode;
}

export default function HolidayMascotEggs({ className, children }: Props) {
  const { t, language } = useLanguage();
  const { holiday, resolved } = useHoliday();
  const { profile } = useAuth();
  const { playTileSelectSound, playWheelSpinSound, playPowerUpSound } = useSoundEffects();
  const [spin, setSpin] = useState(false);
  const [bounce, setBounce] = useState(0);
  const taps = useRef({ n: 0, at: 0 });
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  const momentArt = useMemo(() => {
    if (!holiday) return null;
    const now = new Date();
    const moments = momentsFor({ holiday, locale: language, localDate: localDateIn(now), hour: now.getHours(), countryCode: profile?.country_code });
    const key = (Object.keys(MOMENT_MASCOT) as (keyof typeof MOMENT_MASCOT)[]).find((k) => moments.includes(k));
    return key ? MOMENT_MASCOT[key] : null;
  }, [holiday, language, profile?.country_code]);

  useEffect(() => () => {
    if (press.current) clearTimeout(press.current);
  }, []);

  const active = resolved && !!holiday;

  const tap = () => {
    if (!holiday) return;
    const now = Date.now();
    taps.current = { n: now - taps.current.at > TAP_GAP_MS ? 1 : taps.current.n + 1, at: now };
    setBounce((b) => b + 1);
    playTileSelectSound();
    if (taps.current.n < TAP_GOAL[holiday]) return;
    taps.current.n = 0;
    if (holiday === 'hanukkah') {
      playWheelSpinSound();
      setSpin(true);
      celebrateHolidayEgg('mascot_spin');
    } else {
      playPowerUpSound();
      emitHolidayFx(SNOWBALL_EVENT);
      celebrateHolidayEgg('mascot_snowball');
    }
  };

  const startPress = () => {
    if (!active) return;
    if (press.current) clearTimeout(press.current);
    press.current = setTimeout(() => emitHolidayFx(SNOWGLOBE_EVENT), LONG_PRESS_MS);
  };
  const endPress = () => {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  };

  return (
    <button
      type="button"
      data-testid="holiday-mascot-eggs"
      disabled={!active}
      tabIndex={active ? undefined : -1}
      aria-hidden={active ? undefined : true}
      aria-label={active ? t('holiday.eggs.mascotLabel') : undefined}
      onClick={tap}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onContextMenu={(e) => e.preventDefault()}
      onAnimationEnd={() => setSpin(false)}
      className={cn('touch-manipulation select-none [-webkit-touch-callout:none]', !active && 'pointer-events-none', className, spin && 'holiday-mascot-spin')}
    >
      <span key={bounce} className={cn('block', bounce > 0 && 'holiday-pop-in')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {active && momentArt ? <img src={momentArt} alt="" width={140} height={140} className="h-auto w-full" /> : children}
      </span>
    </button>
  );
}
