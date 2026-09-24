'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsGuest } from '@/hooks/useIsGuest';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getStoredCustomAvatar } from '@/utils/profileStorage';
import type { LevelUnlock } from '@/lib/avatar/unlocks';
import { trackAvatarSaved, trackAvatarUnlockRevealed } from '@/lib/avatar/avatarTelemetry';
import { applyUnlockToConfig, markRevealShown, type UnlockReveal } from '@/lib/avatar/revealTrigger';
import UnlockRevealOverlay from './UnlockRevealOverlay';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export interface ConnectedUnlockRevealProps {
  reveal: UnlockReveal;
  onClose: () => void;
  /** User re-opened it from the "New unlock!" chip — no telemetry, no session bump. */
  replay?: boolean;
}

/**
 * The reveal wired to the real player: their saved avatar, one-tap equip via
 * the existing updateProfile path (same write the profile builder does), and
 * the sign-up tease for guests. Lazy-loaded by every host (it pulls the
 * avatar renderer), so results / header bundles stay light.
 */
export default function ConnectedUnlockReveal({ reveal, onClose, replay = false }: ConnectedUnlockRevealProps) {
  const { isAuthenticated, profile, updateProfile, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const isGuest = useIsGuest(isAuthenticated);
  const [showSignup, setShowSignup] = useState(false);
  const [open, setOpen] = useState(true);

  // Equipping several unlocks in a row compounds on the latest saved look.
  const configRef = useRef<CustomAvatarConfig | null>(null);
  const profileConfig = profile?.avatar_config as CustomAvatarConfig | null | undefined;
  const currentConfig = useCallback(
    (): CustomAvatarConfig => configRef.current ?? profileConfig ?? getStoredCustomAvatar() ?? DEFAULT_AVATAR_CONFIG,
    [profileConfig],
  );

  const handleShown = useCallback(() => {
    if (replay) return;
    if (markRevealShown(reveal)) trackAvatarUnlockRevealed(reveal.unlocks, reveal.level);
  }, [replay, reveal]);

  const handleEquip = useCallback(async (unlock: LevelUnlock): Promise<boolean> => {
    const before = currentConfig();
    const next = applyUnlockToConfig(before, unlock);
    try {
      const { error } = await updateProfile({ avatar_config: next });
      if (error) return false;
    } catch {
      return false;
    }
    configRef.current = next;
    trackAvatarSaved(before, next);
    // Pull current_level too, so the editor never shows this part as locked.
    void refreshProfile().catch(() => {});
    return true;
  }, [currentConfig, updateProfile, refreshProfile]);

  // Brag link: the public profile (B's /u/<username>, ?from= source contract).
  const username = typeof profile?.username === 'string' ? profile.username : '';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${language}${username && !isGuest ? `/u/${encodeURIComponent(username)}?from=share` : ''}`
    : undefined;

  const handleSignUp = useCallback(() => {
    setOpen(false);
    setShowSignup(true);
  }, []);

  return (
    <>
      {open && (
        <UnlockRevealOverlay
          reveal={reveal}
          config={currentConfig()}
          isGuest={isGuest}
          onEquip={handleEquip}
          onSignUp={handleSignUp}
          onClose={onClose}
          onShown={handleShown}
          shareUrl={shareUrl}
        />
      )}
      {showSignup && (
        <AuthModal
          isOpen
          initialMode="signup"
          showGuestStats
          onClose={() => { setShowSignup(false); onClose(); }}
        />
      )}
    </>
  );
}
