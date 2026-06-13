'use client';
import { useEffect, useMemo, useRef } from 'react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoostStatus } from '@/hooks/useBoostStatus';
import { useBoostClaim } from '@/hooks/useBoostClaim';
import { useExperiment } from '@/hooks/useExperiment';
import { BOOST_TYPES, BOOST_CONFIGS, type BoostType } from '@/shared/types/boosts';
import { BOOST_ICONS } from './boostIcons';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';

interface Props {
  open: boolean;
  mode: 'mp' | 'sp' | 'drill' | 'classic';
  sessionId: string;
  onClose: () => void;
}

export function BoostPicker({ open, mode, sessionId, onClose }: Props) {
  const { t } = useLanguage();
  const { status } = useBoostStatus();
  const { claim, claimed, isLoading } = useBoostClaim(sessionId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // A/B: which boost gets top-of-grid placement.
  const { variant: orderVariant, trackExposure: trackOrderExposure } =
    useExperiment('boost-picker-order');

  useEffect(() => {
    if (open) {
      posthog?.capture('boost_picker_opened', { mode, order_variant: orderVariant });
      trackOrderExposure();
    }
  }, [open, mode, orderVariant, trackOrderExposure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap: keep Tab cycling within the dialog so Shift+Tab from the
      // close button doesn't escape behind the modal to the Start Game button.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // Move initial focus into the dialog
    closeBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Promote the variant's chosen boost to the front of the grid (no-op
  // when control or when the chosen boost isn't eligible for this mode).
  const eligible = useMemo(() => {
    const base = BOOST_TYPES.filter((bt) =>
      BOOST_CONFIGS[bt].availableIn.includes(mode),
    );
    const promote: BoostType | null =
      orderVariant === 'score-first' ? 'scoreMultiplier'
      : orderVariant === 'freeze-first' ? 'freezeTime'
      : null;
    if (!promote || !base.includes(promote)) return base;
    return [promote, ...base.filter((bt) => bt !== promote)];
  }, [mode, orderVariant]);

  if (!open) return null;

  const remaining = status?.remaining ?? 0;
  const cap = status?.capPerDay ?? 5;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="boost-picker-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 motion-reduce:transition-none">
      <div
        ref={dialogRef}
        className="mx-2 my-4 w-full max-w-[calc(100vw-1rem)] sm:max-w-md rounded-neo border-neo-thick bg-neo-navy p-4 sm:p-6 shadow-hard-lg motion-safe:animate-neo-pop"
      >
        <h2 id="boost-picker-title" className="font-neo-display text-2xl text-neo-white">
          {t('boosts.title')}
        </h2>
        <p className="mt-1 text-sm text-neo-white">
          {t('boosts.remaining', { n: String(remaining), cap: String(cap) })}
        </p>
        <div className="mt-4 grid gap-3">
          {eligible.map((bt) => (
            <BoostCard key={bt}
              boostType={bt}
              disabled={isLoading || remaining === 0 || claimed?.boostType === bt}
              isClaimed={claimed?.boostType === bt}
              onClaim={(rect) => {
                claim(bt);
                if (rect && SharedFxApp.isInitialized()) {
                  SharedFxApp.spawnBurst(
                    `boost-${bt}`,
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                  );
                }
              }} />
          ))}
        </div>
        <button
          ref={closeBtnRef}
          onClick={onClose}
          data-testid="boost-skip"
          className="mt-4 w-full min-h-[44px] rounded-neo border-neo bg-neo-cream py-2 font-neo-body font-bold text-neo-navy shadow-hard hover:active:shadow-hard-pressed">
          {t('boosts.skipAndPlay')}
        </button>
      </div>
    </div>
  );
}

function BoostCard({ boostType, disabled, isClaimed, onClaim }: {
  boostType: BoostType; disabled: boolean; isClaimed: boolean; onClaim: (rect: DOMRect | null) => void;
}) {
  const { t } = useLanguage();
  const { Icon, bg, fg } = BOOST_ICONS[boostType];
  return (
    <button
      onClick={(e) => onClaim((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
      disabled={disabled}
      data-boost-card
      aria-label={t(`${BOOST_CONFIGS[boostType].i18nKey}.title`)}
      className="flex items-start gap-3 rounded-neo border-neo bg-neo-cream p-4 text-start shadow-hard transition disabled:opacity-50 hover:active:shadow-hard-pressed">
      <span
        data-boost-icon
        aria-hidden="true"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo ${bg} ${fg} shadow-hard-sm`}
      >
        <Icon className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <span className="flex-1">
        <span className="block font-neo-display text-lg text-neo-navy">
          {t(`${BOOST_CONFIGS[boostType].i18nKey}.title`)}
        </span>
        <span className="mt-1 block text-sm text-neo-navy/70">
          {t(`${BOOST_CONFIGS[boostType].i18nKey}.description`)}
        </span>
        <span className="mt-2 block text-xs font-bold text-neo-pink">
          {isClaimed ? t('boosts.activeThisGame') : t('boosts.watchAd')}
        </span>
      </span>
    </button>
  );
}
