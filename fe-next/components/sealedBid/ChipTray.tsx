'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { clampStake, MIN_STAKE, type ChipWallet } from '@/lib/sealedBid/sp/chipWallet';
import { SEALED_BID_ASSETS } from './sealedBidAssets';

export interface ChipTrayProps {
  balance: number;
  stake: number;
  disabled?: boolean;
  onStakeChange: (stake: number) => void;
  reducedMotion?: boolean;
  /** Hide balance line (page HUD owns stack). Default false for back-compat. */
  hideBalance?: boolean;
  /** Round poker-chip look. */
  chipStyle?: boolean;
  /** Hide stake label when parent already shows pot. */
  hideStakeLabel?: boolean;
}

type DenominationType = 5 | 10 | 25 | 'allIn' | 'clear';

interface ChipButtonConfig {
  label: string;
  ariaLabel: string;
  bgColor: string;
  textColor: string;
  denomination?: number;
  type: DenominationType;
}

export default function ChipTray({
  balance,
  stake,
  disabled = false,
  onStakeChange,
  reducedMotion = false,
  hideBalance = false,
  chipStyle = false,
  hideStakeLabel = false,
}: ChipTrayProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const wallet: ChipWallet = {
    chips: balance,
    busted: false,
  };

  const denominationButtons: ChipButtonConfig[] = [
    {
      label: '+5',
      ariaLabel: `+5 ${t('sealedBid.chips')}`,
      bgColor: 'bg-neo-cyan',
      textColor: 'text-neo-navy',
      denomination: 5,
      type: 5,
    },
    {
      label: '+10',
      ariaLabel: `+10 ${t('sealedBid.chips')}`,
      bgColor: 'bg-neo-lime',
      textColor: 'text-neo-navy',
      denomination: 10,
      type: 10,
    },
    {
      label: '+25',
      ariaLabel: `+25 ${t('sealedBid.chips')}`,
      bgColor: 'bg-neo-pink',
      textColor: 'text-neo-white',
      denomination: 25,
      type: 25,
    },
    {
      label: t('sealedBid.allIn'),
      ariaLabel: `${t('sealedBid.allIn')} — ${balance} ${t('sealedBid.chips')}`,
      bgColor: 'bg-neo-purple',
      textColor: 'text-neo-white',
      type: 'allIn',
    },
    {
      label: t('sealedBid.clear'),
      ariaLabel: t('sealedBid.clear'),
      bgColor: 'bg-neo-navy-light',
      textColor: 'text-neo-cream',
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

    if (
      !reducedMotion &&
      config.type !== 'allIn' &&
      config.type !== 'clear' &&
      containerRef.current
    ) {
      const chipEl = containerRef.current.querySelector(
        `[data-chip-type="${config.type}"]`
      ) as HTMLElement | null;
      if (chipEl) {
        gsap.fromTo(
          chipEl,
          { y: -16, scale: 0.85 },
          { y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
        );
      }
    }

    onStakeChange(newStake);
  };

  return (
    <div ref={containerRef} data-testid="chip-tray" className="flex w-full flex-col gap-2">
      {!hideStakeLabel && (
        <div className="text-center">
          <div className="font-neo-body text-xs opacity-75">{t('sealedBid.currentStake')}</div>
          <div className="font-neo-display text-xl font-bold tabular-nums">
            {stake} {t('sealedBid.chips')}
          </div>
        </div>
      )}

      <div
        className={
          chipStyle
            ? 'flex flex-wrap items-center justify-center gap-2 sm:gap-3'
            : 'grid grid-cols-3 gap-2 sm:grid-cols-5'
        }
        role="group"
        aria-label={t('sealedBid.stake')}
      >
        {denominationButtons.map((config) => (
          <button
            key={config.type}
            type="button"
            data-chip-type={config.type}
            onClick={() => handleChipClick(config)}
            disabled={disabled}
            aria-label={config.ariaLabel}
            className={
              chipStyle
                ? `
                  relative flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-full border-[3px] border-black
                  ${config.bgColor} ${config.textColor}
                  font-neo-display text-[11px] font-black leading-none
                  shadow-hard
                  transition-transform active:translate-y-0.5 active:shadow-hard-pressed
                  disabled:cursor-not-allowed disabled:opacity-45
                  sm:h-14 sm:w-14 sm:text-xs
                `
                : `
                  relative min-h-[44px] min-w-[44px] rounded-neo border-neo-thick border-black px-3 py-2.5
                  ${config.bgColor} ${config.textColor}
                  font-neo-display text-sm font-bold shadow-hard
                  transition-all active:shadow-hard-pressed
                  disabled:cursor-not-allowed disabled:opacity-50
                `
            }
          >
            {chipStyle && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${SEALED_BID_ASSETS.chipRing})`,
                  backgroundSize: '100% 100%',
                }}
              />
            )}
            <span className="relative z-10">{config.label}</span>
          </button>
        ))}
      </div>

      {!hideBalance && (
        <div className="text-center font-neo-body text-xs opacity-60">
          {t('sealedBid.balance')}: {balance} {t('sealedBid.chips')}
        </div>
      )}
    </div>
  );
}
