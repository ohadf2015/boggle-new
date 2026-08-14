'use client';

/**
 * SealedBidTable — single casino play surface for solo sealed-bid.
 * One path: form word → set stake → lock (or pass).
 * Wood-rail felt + pot + chips + primary CTA.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { canLockBid, lockDisabledReason } from '@/lib/sealedBid/sp/lockGate';
import SealedBidWheel from './SealedBidWheel';
import OddsBoard from './OddsBoard';
import ChipTray from './ChipTray';
import SealedBidFeltShell from './SealedBidFeltShell';

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
      className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-3"
    >
      <SealedBidFeltShell className="min-h-[min(52dvh,420px)]">
        {/* Built word / empty prompt */}
        <div className="w-full px-3 pt-3">
          <div
            data-testid="sb-word-display"
            className="mx-auto flex min-h-11 max-w-xs items-center justify-center rounded-neo border-2 border-black bg-black/45 px-3 py-2 text-center shadow-hard-sm backdrop-blur-[1px]"
          >
            {word ? (
              <span className="font-neo-display text-xl font-black uppercase tracking-[0.2em] text-neo-yellow sm:text-2xl">
                {word}
              </span>
            ) : (
              <span className="font-neo-body text-xs font-medium text-white/75 sm:text-sm">
                {t('sealedBid.tapHint') || t('sealedBid.yourWord')}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center px-2 py-1">
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

        {/* One rim strip: stake · odds. Previously two stacked blocks whose
            combined 117px left the wheel less height than the chrome around
            it — and the odds block only appeared once the word hit 3 letters,
            so the wheel SHRANK mid-selection and the tiles landed on top of
            their neighbours. One fixed-height row keeps the wheel steady. */}
        <div className="w-full px-3 pb-3">
          <div className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-full border-2 border-black bg-neo-navy/90 px-3 py-1.5 shadow-hard-sm">
            <div
              data-testid="sb-stake-pot"
              className="flex min-w-0 items-center gap-1.5 whitespace-nowrap"
            >
              <span className="font-neo-body text-[10px] font-bold uppercase tracking-wide text-neo-white/60">
                {t('sealedBid.currentStake')}
              </span>
              <span className="font-neo-display text-lg font-black tabular-nums text-neo-yellow">
                {stake}
              </span>
            </div>

            {showOdds && (
              <>
                <span aria-hidden className="h-4 w-px shrink-0 bg-neo-white/25" />
                <OddsBoard word={word} stake={stake} reducedMotion={reducedMotion} compact />
              </>
            )}
          </div>
        </div>
      </SealedBidFeltShell>

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
            aria-busy={pending}
            className="flex min-h-12 min-w-0 flex-[1.6] items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-3 py-3 font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:bg-neo-lime/40 disabled:text-neo-navy/70 disabled:opacity-100 sm:text-base"
          >
            {/* The dictionary check is a ~600 ms network round-trip that runs
                BEFORE the showdown mounts. Without a label change the button
                just went dead and the tap read as dropped. */}
            {pending ? (
              <>
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-neo-navy border-t-transparent motion-reduce:animate-none"
                />
                {t('sealedBid.revealing')}
              </>
            ) : (
              t('sealedBid.lockBid')
            )}
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
