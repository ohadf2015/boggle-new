'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoostStatus } from '@/hooks/useBoostStatus';
import { useBoostClaim } from '@/hooks/useBoostClaim';
import { BOOST_TYPES, BOOST_CONFIGS, type BoostType } from '@/shared/types/boosts';

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

  useEffect(() => {
    if (open) {
      posthog?.capture('boost_picker_opened', { mode });
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const eligible = BOOST_TYPES.filter((bt) => BOOST_CONFIGS[bt].availableIn.includes(mode));
  const remaining = status?.remaining ?? 0;
  const cap = status?.capPerDay ?? 5;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="boost-picker-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 motion-reduce:transition-none">
      <div className="m-4 w-full max-w-md rounded-neo border-neo-thick bg-neo-navy p-6 shadow-hard-lg motion-safe:animate-neo-pop">
        <h2 id="boost-picker-title" className="font-neo-display text-2xl text-neo-cream">
          {t('boosts.title')}
        </h2>
        <p className="mt-1 text-sm text-neo-cream/70">
          {t('boosts.remaining').replace('{{n}}', String(remaining)).replace('{{cap}}', String(cap))}
        </p>
        <div className="mt-4 grid gap-3">
          {eligible.map((bt) => (
            <BoostCard key={bt}
              boostType={bt}
              disabled={isLoading || remaining === 0 || claimed?.boostType === bt}
              isClaimed={claimed?.boostType === bt}
              onClaim={() => claim(bt)} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-neo border-neo bg-neo-cream py-2 font-neo-body text-neo-navy shadow-hard hover:active:shadow-hard-pressed">
          {t('boosts.close')}
        </button>
      </div>
    </div>
  );
}

function BoostCard({ boostType, disabled, isClaimed, onClaim }: {
  boostType: BoostType; disabled: boolean; isClaimed: boolean; onClaim: () => void;
}) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClaim}
      disabled={disabled}
      aria-label={t(`${BOOST_CONFIGS[boostType].i18nKey}.title`)}
      className="rounded-neo border-neo bg-neo-cream p-4 text-start shadow-hard transition disabled:opacity-50 hover:active:shadow-hard-pressed">
      <div className="font-neo-display text-lg text-neo-navy">
        {t(`${BOOST_CONFIGS[boostType].i18nKey}.title`)}
      </div>
      <div className="mt-1 text-sm text-neo-navy/70">
        {t(`${BOOST_CONFIGS[boostType].i18nKey}.description`)}
      </div>
      <div className="mt-2 text-xs font-bold text-neo-pink">
        {isClaimed ? t('boosts.activeThisGame') : t('boosts.watchAd')}
      </div>
    </button>
  );
}
