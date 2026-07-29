'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  roomCode: string;
  hostName?: string;
  onSkip: () => void;
}

/**
 * Sticky pink-accent banner shown to first-time invitees during onboarding.
 * Names the host (or falls back) and exposes a one-tap Skip-and-Join CTA.
 * Reused in QuickProfileSetup (Task 5) and InviteTutorialTeaser (Task 6).
 */
const InviteContextBanner: React.FC<Props> = ({ roomCode, hostName, onSkip }) => {
  const { t, dir } = useLanguage();
  const displayName = hostName?.trim() || t('invite.banner.yourFriend');

  return (
    <div
      data-testid="invite-banner"
      dir={dir}
      className="sticky top-0 z-30 w-full bg-neo-pink text-neo-black border-b-2 border-neo-black shadow-hard-sm px-4 py-2 flex items-center justify-between gap-3"
      role="status"
      aria-live="polite"
    >
      <p className="font-neo-display font-black text-sm uppercase tracking-wide truncate min-w-0">
        <span aria-hidden>👋 </span>
        {t('invite.banner.host', { hostName: displayName })}{' '}
        <span className="font-mono bg-neo-black text-neo-white px-1.5 py-0.5 rounded-neo">
          {roomCode}
        </span>
      </p>
      <button
        data-testid="invite-banner-skip"
        type="button"
        onClick={onSkip}
        className="shrink-0 min-h-[44px] px-3 py-2 rounded-neo bg-neo-black text-neo-pink border-2 border-neo-black font-neo-display font-black text-xs uppercase tracking-wide active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
      >
        {t('invite.banner.skipCTA')}
      </button>
    </div>
  );
};

export default InviteContextBanner;
