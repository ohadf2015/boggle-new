'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { clampStake, MIN_STAKE, type ChipWallet } from '@/lib/sealedBid/sp/chipWallet';

export interface ChipTrayProps {
  balance: number;
  stake: number;
  disabled?: boolean;
  onStakeChange: (stake: number) => void;
  reducedMotion?: boolean;
}

type DenominationType = 5 | 10 | 25 | 'allIn' | 'clear';

interface ChipButtonConfig {
  label: string;
  ariaLabel: string;
  bgColor: string;
  denomination?: number;
  type: DenominationType;
}

export default function ChipTray({
  balance,
  stake,
  disabled = false,
  onStakeChange,
  reducedMotion = false,
}: ChipTrayProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a wallet for clampStake
  const wallet: ChipWallet = {
    chips: balance,
    busted: false,
  };

  const denominationButtons: ChipButtonConfig[] = [
    {
      label: '+5',
      ariaLabel: '+5 chips',
      bgColor: 'bg-neo-cyan',
      denomination: 5,
      type: 5,
    },
    {
      label: '+10',
      ariaLabel: '+10 chips',
      bgColor: 'bg-neo-lime',
      denomination: 10,
      type: 10,
    },
    {
      label: '+25',
      ariaLabel: '+25 chips',
      bgColor: 'bg-neo-pink',
      denomination: 25,
      type: 25,
    },
    {
      label: t('sealedBid.allIn'),
      ariaLabel: `${t('sealedBid.allIn')} - stake all ${balance} chips`,
      bgColor: 'bg-neo-purple',
      type: 'allIn',
    },
    {
      label: t('sealedBid.clear'),
      ariaLabel: `${t('sealedBid.clear')} - reset to ${MIN_STAKE}`,
      bgColor: 'bg-neo-navy-light border-neo-thick border-neo-cream',
      type: 'clear',
    },
  ];

  const handleChipClick = (config: ChipButtonConfig) => {
    if (disabled) return;

    let newStake: number;

    if (config.type === 'allIn') {
      newStake = balance;
    } else if (config.type === 'clear') {
      newStake = MIN_STAKE;
    } else if (typeof config.denomination === 'number') {
      newStake = clampStake(wallet, stake + config.denomination);
    } else {
      return;
    }

    // Animate the chip if not reduced motion and it's an add action
    if (
      !reducedMotion &&
      config.type !== 'allIn' &&
      config.type !== 'clear' &&
      containerRef.current
    ) {
      const chipEl = containerRef.current.querySelector(
        `[data-chip-type="${config.type}"]`
      ) as HTMLElement;
      if (chipEl) {
        // GSAP chip-toss: small y/scale back.out
        gsap.fromTo(
          chipEl,
          {
            y: -20,
            scale: 0.8,
          },
          {
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: 'back.out',
          }
        );
      }
    }

    onStakeChange(newStake);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {/* Display current stake */}
      <div className="text-center">
        <div className="text-sm opacity-75">{t('sealedBid.currentStake')}</div>
        <div className="text-2xl font-neo-display font-bold">{stake} chips</div>
      </div>

      {/* Chip buttons grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-2">
        {denominationButtons.map((config) => (
          <button
            key={config.type}
            data-chip-type={config.type}
            onClick={() => handleChipClick(config)}
            disabled={disabled}
            aria-label={config.ariaLabel}
            className={`
              relative
              px-3 py-2
              md:px-2 md:py-1
              ${config.bgColor}
              border-neo-thick border-black
              shadow-hard
              rounded-neo
              font-neo-display font-bold
              text-sm
              md:text-xs
              transition-all
              active:shadow-hard-pressed
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:not-disabled:shadow-hard-lg
            `}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Balance info */}
      <div className="text-xs text-center opacity-60">
        {t('sealedBid.balance')}: {balance} chips
      </div>
    </div>
  );
}
