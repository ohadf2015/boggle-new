'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { shareWithFallback } from '@/utils/shareWithFallback';

interface ProfileShareButtonProps {
  userId: string;
  isOwn: boolean;
  level: number;
  achievements: number;
  surface: string;
  className?: string;
}

/** Share a /player link (it unfurls with the player's public name). Text never names someone else. */
export function ProfileShareButton({ userId, isOwn, level, achievements, surface, className }: ProfileShareButtonProps) {
  const { t, language } = useLanguage();
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    if (busy || typeof window === 'undefined') return;
    setBusy(true);
    try {
      const url = `${window.location.origin}/${language}/player/${encodeURIComponent(userId)}`;
      const text = isOwn
        ? t('brag2.profile.shareTextOwn', { level, achievements })
        : t('brag2.profile.shareTextOther');
      const result = await shareWithFallback({ title: 'LexiClash', text, url, clipboardText: `${text} ${url}` });
      posthog.capture('brag_share_tapped', { surface, kind: 'profile', result });
      if (result === 'copied') toast.success(t('profile.showcase.linkCopied'));
      else if (result === 'failed') toast.error(t('profile.showcase.shareFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={busy}
      data-testid="profile-share"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-neo',
        'border-3 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm',
        'font-neo-display font-black text-sm uppercase disabled:opacity-60',
        'motion-safe:hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]',
        className,
      )}
    >
      <Share2 aria-hidden className="w-4 h-4" strokeWidth={2.75} />
      {t(isOwn ? 'profile.showcase.share' : 'profile.showcase.shareProfile')}
    </button>
  );
}

export default ProfileShareButton;
