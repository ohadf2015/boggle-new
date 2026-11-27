'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { cn } from '@/lib/utils';
import styles from './holidayDaily.module.css';

const ART: Record<HolidayKey, { src: string; width: number; height: number }> = {
  hanukkah: { src: '/holidays/m-hanukkah.webp', width: 416, height: 512 },
  christmas: { src: '/holidays/m-christmas.webp', width: 512, height: 443 },
};

interface Props {
  holiday: HolidayKey;
  cue: number;
  line?: string;
  className?: string;
  style?: CSSProperties;
}

export default function HolidayMascotPop({ holiday, cue, line, className, style }: Props) {
  const { t } = useLanguage();
  const [motion, setMotion] = useState<'bounce' | 'wiggle' | null>(null);
  const [taps, setTaps] = useState(0);

  useEffect(() => {
    if (cue > 0) setMotion('bounce');
  }, [cue]);

  const art = ART[holiday];
  return (
    <button
      type="button"
      data-testid="holiday-mascot-pop"
      aria-label={t('holiday.daily.mascotTap', 'Say hi to the holiday mascot')}
      onClick={() => {
        setTaps((n) => n + 1);
        setMotion(null);
        requestAnimationFrame(() => setMotion('wiggle'));
      }}
      onAnimationEnd={() => setMotion(null)}
      style={style}
      className={cn('pointer-events-auto relative flex flex-col items-center', motion === 'bounce' && styles.bounce, motion === 'wiggle' && styles.wiggle, className)}
    >
      {(line || taps > 0) && (
        <span className="mb-1 max-w-[9rem] rounded-xl border-2 border-black bg-neo-cream px-2 py-1 text-center font-neo-display text-[11px] font-bold leading-tight text-neo-navy shadow-hard-sm">
          {taps > 0 && !line ? t(`holiday.daily.mascotHi.${holiday}`, holiday === 'hanukkah' ? 'Happy Hanukkah!' : 'Merry Christmas!') : line}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art.src} alt="" width={art.width} height={art.height} className="h-16 w-auto drop-shadow-[3px_3px_0_rgb(var(--neo-black))]" />
    </button>
  );
}
