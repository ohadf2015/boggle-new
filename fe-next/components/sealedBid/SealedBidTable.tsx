'use client';

/**
 * SealedBidTable — single casino play surface for solo sealed-bid.
 * One path: form word → set stake → lock (or pass).
 * Felt + pot + chips + primary CTA; no nested card chrome.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { canLockBid, lockDisabledReason } from '@/lib/sealedBid/sp/lockGate';
import SealedBidWheel from './SealedBidWheel';
import OddsBoard from './OddsBoard';
import ChipTray from './ChipTray';
import { SEALED_BID_ASSETS } from './sealedBidAssets';

export interface SealedBidTableProps {
  letters: string[];
  word: string;
  stake: number;
  balance: number;
  disabled?: boolean;
  pending?: boolean;
  busted?: boolean;
  onWordChange: (word: string, indices: number[]) => void;
  onWordSubmit: (word: string, indices: number[]) => void;
  onStakeChange: (stake: number) => void;
  onLock: () => void;
  onPass: () => void;
  reducedMotion?: boolean;
  dir?: 'ltr' | 'rtl';
}

export default function SealedBidTable({
  letters,
  word,
  stake,
  balance,
  disabled = false,
  pending = false,
  busted = false,
  onWordChange,
  onWordSubmit,
  onStakeChange,
  onLock,
  onPass,
  reducedMotion = false,
  dir = 'ltr',
}: SealedBidTableProps) {
  const { t } = useLanguage();
  const lockable = canLockBid({ word, stake, pending, busted });
  const reason = lockDisabledReason({ word, stake, pending, busted });
  const showOdds = word.length >= 3;

  const hintKey =
    reason === 'needWord'
      ? 'sealedBid.needWord'
      : reason === 'needStake'
        ? 'sealedBid.needStake'
        : reason === 'busted'
          ? 'sealedBid.busted'
          : reason === 'pending'
            ? 'sealedBid.lockBid'
            : null;

  return (
    <div
      data-testid="sb-table"
      className="flex w-full max-w-lg flex-1 flex-col gap-3 min-h-0 mx-auto"
    >
      {/* Felt play zone: wheel + word pot */}
      <div
        data-testid="sb-felt"
        className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-neo border-3 border-black shadow-hard-lg"
        style={{
          backgroundColor: 'oklch(0.22 0.05 160)',
          backgroundImage: [
            `url(${SEALED_BID_ASSETS.feltTile})`,
            'radial-gradient(ellipse at center, oklch(0.34 0.07 155 / 0.55) 0%, oklch(0.16 0.03 250 / 0.85) 100%)',
          ].join(', '),
          backgroundSize: '128px 128px, cover',
          backgroundBlendMode: 'normal, multiply',
        }}
      >
        {/* Soft vignette rim */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_48px_oklch(0.12_0.03_250/0.75)]"
        />

        {/* Built word / empty prompt — the "pot" label strip */}
        <div className="relative z-10 w-full px-3 pt-3">
          <div
            data-testid="sb-word-display"
            className="mx-auto flex min-h-11 max-w-xs items-center justify-center rounded-neo border-2 border-black bg-neo-navy/80 px-3 py-2 text-center shadow-hard-sm"
          >
            {word ? (
              <span className="font-neo-display text-xl font-black tracking-[0.2em] text-neo-yellow uppercase sm:text-2xl">
                {word}
              </span>
            ) : (
              <span className="font-neo-body text-xs font-medium text-neo-cream/70 sm:text-sm">
                {t('sealedBid.tapHint') || t('sealedBid.yourWord')}
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 flex w-full flex-1 items-center justify-center px-2 py-1 min-h-0">
          <SealedBidWheel
            letters={letters}
            onChange={onWordChange}
            onSubmit={onWordSubmit}
            disabled={disabled || pending || busted}
            reducedMotion={reducedMotion}
            dir={dir}
            compact
          />
        </div>

        {/* Stake pot + odds strip on the felt rim */}
        <div className="relative z-10 w-full space-y-2 px-3 pb-3">
          <div
            data-testid="sb-stake-pot"
            className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-full border-2 border-black bg-neo-yellow px-4 py-1.5 shadow-hard-sm"
          >
            <span className="font-neo-body text-[10px] font-bold uppercase tracking-wide text-neo-navy/70">
              {t('sealedBid.currentStake')}
            </span>
            <span className="font-neo-display text-lg font-black text-neo-navy tabular-nums">
              {stake}
            </span>
            <span className="font-neo-body text-[10px] font-bold uppercase text-neo-navy/70">
              {t('sealedBid.chips')}
            </span>
          </div>

          {showOdds && (
            <OddsBoard word={word} stake={stake} reducedMotion={reducedMotion} compact />
          )}
        </div>
      </div>

      {/* Chip tray — round casino chips, no balance dupe */}
      <ChipTray
        balance={balance}
        stake={stake}
        onStakeChange={onStakeChange}
        disabled={disabled || pending || busted}
        reducedMotion={reducedMotion}
        hideBalance
        hideStakeLabel
        chipStyle
      />

      {/* Action row */}
      <div className="flex shrink-0 flex-col gap-1.5">
        {hintKey && (
          <p
            data-testid="sb-lock-hint"
            className="text-center font-neo-body text-xs text-neo-cream/70"
          >
            {t(hintKey)}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="sb-lock"
            onClick={onLock}
            disabled={!lockable || disabled}
            className="flex min-h-12 min-w-0 flex-[1.6] items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-3 py-3 font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:bg-neo-lime/40 disabled:text-neo-navy/70 disabled:opacity-100 sm:text-base"
          >
            {t('sealedBid.lockBid')}
          </button>
          <button
            type="button"
            data-testid="sb-pass"
            onClick={onPass}
            disabled={pending || busted || disabled}
            className="min-h-12 min-w-[5.25rem] shrink-0 rounded-neo border-3 border-black bg-neo-navy-light px-3 py-3 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white shadow-hard-sm disabled:opacity-50 sm:min-w-[6rem]"
          >
            {t('sealedBid.pass')}
          </button>
        </div>
      </div>
    </div>
  );
}
