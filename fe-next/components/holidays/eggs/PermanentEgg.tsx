'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import { celebrateHolidayEgg } from '@/lib/holidays/holidayClient';
import { cn } from '@/lib/utils';
import '../holidayFx.css';

const EGGS = {
  lost_latke: { art: '/holidays/lost-latke.webp', size: 'size-20', line: true },
  snowman: { art: '/holidays/peek-snowman.webp', size: 'size-10', line: false },
  gingerbread: { art: '/holidays/peek-gingerbread.webp', size: 'size-8', line: false },
} as const;

type EggKind = keyof typeof EGGS;

export function PermanentEggView({ kind, text, label, className }: { kind: EggKind; text: string; label: string; className?: string }) {
  const { playPowerUpSound } = useSoundEffects();
  const [said, setSaid] = useState(false);
  const [wiggle, setWiggle] = useState(0);
  const egg = EGGS[kind];

  return (
    <span className={cn('relative inline-flex flex-col items-center gap-1 align-middle', className)}>
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          playPowerUpSound();
          setWiggle((w) => w + 1);
          setSaid(true);
          celebrateHolidayEgg(kind);
        }}
        className={cn(egg.size, 'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={wiggle} src={egg.art} alt="" width={80} height={80} className={cn('size-full object-contain', wiggle > 0 ? 'holiday-bell-ring' : 'holiday-peek')} />
      </button>
      {egg.line && <span className="text-sm font-bold text-neo-cream">{text}</span>}
      {!egg.line && said && (
        <span role="status" className="holiday-pop-in absolute bottom-full mb-1 whitespace-nowrap rounded-lg border-2 border-black bg-neo-cream px-2 py-1 text-[11px] font-bold text-neo-navy shadow-hard-sm">
          {text}
        </span>
      )}
    </span>
  );
}

export default function PermanentEgg({ kind, className }: { kind: EggKind; className?: string }) {
  const { t } = useLanguage();
  const { holiday, resolved } = useHoliday();
  if (!resolved || !holiday) return null;
  return (
    <PermanentEggView
      kind={kind}
      text={t(`holiday.eggs.permanent.${kind}`)}
      label={t(`holiday.eggs.permanent.${kind}Label`)}
      className={className}
    />
  );
}
