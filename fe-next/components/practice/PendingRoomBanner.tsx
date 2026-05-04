'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInviteContext } from '@/hooks/useInviteContext';
import { consumePendingRoomInvite } from '@/utils/onboardingStorage';
import { trackPracticePendingBannerClicked } from '@/utils/growthTracking';

const DISMISS_KEY = 'lexiclash_invite_banner_dismissed';

interface Props {
  locale: string;
}

/**
 * Practice-hub fallback. Pink dismissible banner shown when the user has a
 * pending MP-room invite but landed on /practice. Tap CTA to consume the
 * invite + navigate; dismiss persists for current session only.
 */
const PendingRoomBanner: React.FC<Props> = ({ locale }) => {
  const { t } = useLanguage();
  const router = useRouter();
  const invite = useInviteContext();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  );
  const mountedAtRef = useRef<number>(0);

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  const handleClick = useCallback(() => {
    const code = consumePendingRoomInvite();
    if (code) {
      trackPracticePendingBannerClicked({
        roomCode: code,
        secondsOnPracticeHub: Math.round((Date.now() - mountedAtRef.current) / 1000),
      });
      router.push(`/${locale}/multiplayer?room=${code}`);
    }
  }, [locale, router]);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  if (!invite || dismissed) return null;

  const displayName = invite.hostName?.trim() || t('invite.banner.yourFriend');

  return (
    <div
      data-testid="pending-room-banner"
      className="mb-4 rounded-neo border-neo-thick bg-neo-pink text-neo-black shadow-hard px-4 py-3 flex items-center justify-between gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 min-w-0">
        <p className="font-neo-display font-black text-sm uppercase tracking-wide truncate">
          <span aria-hidden>👋 </span>
          {t('invite.practice.banner', { hostName: displayName, code: invite.code })}
        </p>
      </div>
      <button
        data-testid="pending-room-banner-cta"
        type="button"
        onClick={handleClick}
        className="shrink-0 min-h-[44px] px-3 py-2 rounded-neo bg-neo-black text-neo-pink border-2 border-neo-black font-neo-display font-black text-xs uppercase tracking-wide active:translate-y-px"
      >
        {t('invite.banner.skipCTA')}
      </button>
      <button
        data-testid="pending-room-banner-dismiss"
        type="button"
        onClick={handleDismiss}
        aria-label={t('invite.practice.dismissAria')}
        className="shrink-0 min-h-[44px] min-w-[44px] text-neo-black/70 hover:text-neo-black font-neo-display font-black text-lg"
      >
        ×
      </button>
    </div>
  );
};

export default PendingRoomBanner;
