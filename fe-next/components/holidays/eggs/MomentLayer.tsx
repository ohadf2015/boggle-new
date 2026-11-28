'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { localDateIn, type HolidayKey } from '@/lib/holidays/calendar';
import { celebrateHolidayEgg } from '@/lib/holidays/holidayClient';
import { momentsFor, type HolidayMoment } from '@/lib/holidays/moments';
import { isHeavyGamePath, stripLocalePrefix } from '@/lib/perf/heavyGamePath';
import { cn } from '@/lib/utils';
import { BellTap, ChimesWish, KohakuRace, RosconPick } from './MomentGames';

const INOCENTE_REVEAL_MS = 5000;
const CLOCK_MS = 60_000;

const DOCK: Partial<Record<HolidayMoment, { art: string; Game: () => React.JSX.Element }>> = {
  kohaku: { art: '/holidays/gold-medal.webp', Game: KohakuRace },
  bells108: { art: '/holidays/gold-bell.webp', Game: BellTap },
  chimes: { art: '/holidays/gold-snowglobe.webp', Game: ChimesWish },
  roscon: { art: '/holidays/gold-cracker-crown.webp', Game: RosconPick },
};

function useMoments(holiday: HolidayKey): HolidayMoment[] {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_MS);
    return () => clearInterval(id);
  }, []);
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  return momentsFor({ holiday, locale: language, localDate: localDateIn(now), hour: now.getHours(), countryCode: profile?.country_code, timeZone });
}

function Banner({ art, children, onClose, tone = 'cream' }: { art: string; children: React.ReactNode; onClose: () => void; tone?: 'cream' | 'gold' }) {
  const { t } = useLanguage();
  return (
    <div role="status" className="holiday-fx-dock pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-[80] flex justify-center px-4">
      <div className={cn('holiday-banner-in pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border-[3px] border-black px-3 py-2 text-neo-navy shadow-hard', tone === 'gold' ? 'bg-neo-cyan' : 'bg-neo-cream')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art} alt="" width={36} height={36} className="size-9 shrink-0 object-contain" />
        <div className="min-w-0 flex-1 text-sm font-bold">{children}</div>
        <button type="button" onClick={onClose} aria-label={t('holiday.eggs.close')} className="shrink-0 rounded-md p-1">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Inocentes({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { playPowerUpSound } = useSoundEffects();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setRevealed(true);
      playPowerUpSound();
      celebrateHolidayEgg('inocente');
    }, INOCENTE_REVEAL_MS);
    return () => clearTimeout(id);
  }, [playPowerUpSound]);
  return (
    <Banner art="/holidays/peek-elf.webp" onClose={onClose} tone={revealed ? 'gold' : 'cream'}>
      <span key={String(revealed)} className={revealed ? 'holiday-card-flip block' : 'block'}>
        {t(revealed ? 'holiday.moment.inocentes.reveal' : 'holiday.moment.inocentes.fake')}
      </span>
    </Banner>
  );
}

function Sleigh() {
  const { t } = useLanguage();
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <button
      type="button"
      onClick={() => celebrateHolidayEgg('sleigh')}
      onAnimationEnd={() => setGone(true)}
      aria-label={t('holiday.moment.sleigh')}
      className="holiday-fx-dock holiday-sleigh fixed start-0 top-[calc(env(safe-area-inset-top)+8px)] z-[70] flex items-end gap-1 motion-reduce:hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/holidays/sleigh.webp" alt="" width={120} height={66} className="h-16 w-auto" />
    </button>
  );
}

function LuciaSweep() {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div
      aria-hidden="true"
      onAnimationEnd={() => setGone(true)}
      className="holiday-fx-dock holiday-sweep pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[70] flex justify-center gap-3 motion-reduce:hidden"
    >
      {Array.from({ length: 7 }, (_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src="/holidays/props-candle.webp" alt="" width={28} height={28} className="size-7" />
      ))}
    </div>
  );
}

function Dock({ moments }: { moments: HolidayMoment[] }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState<HolidayMoment | null>(null);
  const items = moments.filter((m) => DOCK[m]);
  if (!items.length) return null;
  const active = open && DOCK[open];
  return (
    <div className="holiday-fx-dock fixed bottom-[calc(var(--bottom-nav-height,64px)+20px)] start-3 z-40 flex flex-col items-start gap-2">
      {active && open && (
        <section aria-label={t(`holiday.moment.${open}.title`)} className="holiday-pop-in w-[min(86vw,320px)] rounded-2xl border-[3px] border-black bg-neo-navy-light p-3 text-neo-white shadow-hard">
          <header className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-neo-display text-sm font-bold">{t(`holiday.moment.${open}.title`)}</h3>
            <button type="button" onClick={() => setOpen(null)} aria-label={t('holiday.eggs.close')} className="rounded-md p-1">
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>
          <active.Game />
        </section>
      )}
      <div className="flex gap-2">
        {items.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setOpen(open === m ? null : m)}
            aria-expanded={open === m}
            aria-label={t(`holiday.moment.${m}.title`)}
            className="holiday-peek size-12 rounded-full border-[3px] border-black bg-neo-navy p-1 shadow-hard-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DOCK[m]!.art} alt="" width={40} height={40} className="size-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MomentLayer({ holiday }: { holiday: HolidayKey }) {
  const { t } = useLanguage();
  const pathname = usePathname() ?? '';
  const moments = useMoments(holiday);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const close = (k: string) => () => setClosed((s) => new Set(s).add(k));
  const has = (m: HolidayMoment) => moments.includes(m) && !closed.has(m);
  const calm = isHeavyGamePath(pathname) && stripLocalePrefix(pathname) !== '/daily';
  const onDaily = stripLocalePrefix(pathname).startsWith('/daily');
  if (calm) return has('inocentes') && onDaily ? <Inocentes onClose={close('inocentes')} /> : null;

  return (
    <>
      {has('sleigh') && <Sleigh />}
      {has('lucia') && <LuciaSweep />}
      {has('fika') && (
        <Banner art="/holidays/props-cocoa.webp" onClose={close('fika')}>
          {t('holiday.moment.fika')}
        </Banner>
      )}
      {has('boxingDay') && (
        <Banner art="/holidays/props-gift-blue.webp" onClose={close('boxingDay')}>
          {t('holiday.moment.boxingDay')}
        </Banner>
      )}
      {has('inocentes') && onDaily && <Inocentes onClose={close('inocentes')} />}
      <Dock moments={moments} />
    </>
  );
}
