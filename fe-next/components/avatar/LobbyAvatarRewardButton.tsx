'use client';

import { useCallback } from 'react';
import { Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyAvatarPart } from '@/hooks/useDailyAvatarPart';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { DailyPartClaimModal } from './DailyPartClaimModal';

/**
 * Compact lobby reward: a watched ad grants a random premium avatar part
 * (1/day). Cosmetic and symmetric — replaces the old MP-lobby boost, which was
 * a competitive, host-only advantage. Authed-only (the claim endpoint 401s
 * anon); pairs with the auth-agnostic coins button in LobbyRewardCluster.
 */
export function LobbyAvatarRewardButton() {
  const { t } = useLanguage();
  const {
    shouldRender, eligible, exhausted, cooldownActive, remainingLabel,
    granted, modalOpen, openModal, closeModal, claim,
  } = useDailyAvatarPart();

  const handleClaim = useCallback(async () => {
    const grantedPart = await claim();
    if (!grantedPart || !SharedFxApp.isInitialized()) return;
    // Celebrate the unlock at viewport centre (the claim modal is centred).
    SharedFxApp.spawnBurst(
      'sparkle-gold',
      typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
      typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    );
  }, [claim]);

  // Nothing to offer when it can't render or every part is owned — the cluster
  // collapses to the remaining reward(s), just as the old boost button hid.
  if (!shouldRender || exhausted) return null;

  const Icon = granted ? Gift : Sparkles;
  const label = cooldownActive && remainingLabel
    ? remainingLabel
    : t('avatar.dailyPart.lobbyCta');

  return (
    <>
      <button
        type="button"
        data-testid="lobby-avatar-reward"
        onClick={() => eligible && openModal()}
        disabled={!eligible}
        aria-label={t('avatar.dailyPart.title')}
        className={cn(
          'inline-flex items-center gap-2 rounded-neo border-neo bg-neo-purple px-4 py-2',
          'font-neo-display text-neo-white shadow-hard transition-all duration-150',
          eligible
            ? 'hover:-translate-y-0.5 active:translate-y-px active:shadow-hard-pressed'
            : 'opacity-60 cursor-not-allowed',
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
        <span>{label}</span>
      </button>

      <DailyPartClaimModal
        isOpen={modalOpen}
        onClaim={handleClaim}
        onClose={closeModal}
        t={t}
      />
    </>
  );
}

export default LobbyAvatarRewardButton;
