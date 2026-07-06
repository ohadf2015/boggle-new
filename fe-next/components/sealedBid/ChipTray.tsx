'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { clampStake } from '@/lib/sealedBid/sp/chipWallet';

export interface ChipTrayProps {
  balance: number;
  stake: number;
  disabled?: boolean;
  onStakeChange: (stake: number) => void;
  reducedMotion?: boolean;
}

// Explicit class map — Tailwind's JIT scanner can't resolve a template-literal
// `bg-${color}` class name, it needs the literal string present in source.
const DENOMINATIONS = [
  { value: 5, label: '+5', bg: 'bg-neo-cyan' },
  { value: 10, label: '+10', bg: 'bg-neo-lime' },
  { value: 25, label: '+25', bg: 'bg-neo-pink' },
];

export default function ChipTray({
  balance,
  stake,
  disabled = false,
  onStakeChange,
  reducedMotion = false,
}: ChipTrayProps) {
  const { t } = useLanguage();
  const chipRefsMap = useRef<Map<number, HTMLButtonElement | null>>(new Map());

  const handleAdd = (denomination: number) => {
    const desired = stake + denomination;
    const clamped = clampStake({ chips: balance, busted: false }, desired);

    if (!reducedMotion && chipRefsMap.current.has(denomination)) {
      const ref = chipRefsMap.current.get(denomination);
      if (ref) {
        gsap.from(ref, {
          y: -30,
          scale: 1.3,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out',
        });
      }
    }

    onStakeChange(clamped);
  };

  const handleAllIn = () => {
    onStakeChange(balance);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        {DENOMINATIONS.map(({ value, label, bg }) => (
          <button
            key={value}
            ref={(el) => {
              if (el) chipRefsMap.current.set(value, el);
            }}
            onClick={() => handleAdd(value)}
            disabled={disabled}
            aria-label={`${label} chips`}
            className={`
              chip-token
              flex items-center justify-center
              w-14 h-14 rounded-full
              border-neo-thick border-black
              shadow-hard
              ${bg}
              font-neo-display text-base font-bold
              text-black
              disabled:opacity-50 disabled:cursor-not-allowed
              active:shadow-hard-pressed
              transition-shadow
            `}
          >
            {label}
          </button>
        ))}

        <button
          onClick={handleAllIn}
          disabled={disabled}
          aria-label={t('sealedBid.allIn')}
          className={`
            flex-1 px-4 py-3
            border-neo-thick border-black
            shadow-hard
            bg-neo-purple
            font-neo-display text-sm font-bold
            text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            active:shadow-hard-pressed
            transition-shadow
          `}
        >
          {t('sealedBid.allIn')}
        </button>
      </div>

      <div
        className="text-center font-neo-display text-sm"
        aria-label={t('sealedBid.stake', { stake })}
      >
        {t('sealedBid.stake', { stake })}
      </div>
    </div>
  );
}
