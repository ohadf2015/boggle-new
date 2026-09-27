'use client';

import { Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyAvatarPart } from '@/hooks/useDailyAvatarPart';
import { DailyPartClaimModal } from './DailyPartClaimModal';

export function DailyAvatarPartCard() {
  const { t } = useLanguage();
  const {
    shouldRender, eligible, exhausted, cooldownActive, remainingLabel,
    granted, modalOpen, openModal, closeModal, claim,
  } = useDailyAvatarPart();

  if (!shouldRender) return null;

  return (
    <>
      <button
        type="button"
        data-testid="daily-avatar-part-card"
        onClick={() => eligible && openModal()}
        disabled={!eligible}
        className={cn(
          'mt-3 w-full flex items-center gap-3 p-3 rounded-neo text-start',
          // Full border (no side-stripe accent) + purple tint carries the
          // cosmetic hue; the leading badge is the accent.
          'border-3 border-neo-black bg-neo-purple/12 shadow-hard-sm transition-all duration-150',
          eligible && 'hover:bg-neo-purple/20 hover:-translate-y-0.5 active:translate-y-px active:shadow-hard-pressed',
          !eligible && 'opacity-70 cursor-not-allowed',
        )}
        aria-label={t('avatar.dailyPart.title')}
      >
        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-purple/30">
          {granted ? (
            <Gift className="w-5 h-5 text-neo-lime" aria-hidden="true" />
          ) : (
            <Sparkles className="w-5 h-5 text-neo-purple-light" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-neo-body text-sm font-semibold text-neo-white truncate">
            {granted ? t('avatar.dailyPart.justClaimed') : t('avatar.dailyPart.title')}
          </p>
          <p className="font-neo-body text-xs text-neo-white truncate">
            {exhausted
              ? t('avatar.dailyPart.exhausted')
              : cooldownActive && remainingLabel
                ? t('avatar.dailyPart.cooldown', { time: remainingLabel })
                : t('avatar.dailyPart.ready')}
          </p>
        </div>
      </button>

      <DailyPartClaimModal
        isOpen={modalOpen}
        onClaim={async () => { await claim(); }}
        onClose={closeModal}
        t={t}
      />
    </>
  );
}

export default DailyAvatarPartCard;
