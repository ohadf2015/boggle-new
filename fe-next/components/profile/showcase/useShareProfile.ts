'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNativeShare } from '@/hooks/useNativeShare';
import { buildProfileShareUrl } from './profileShowcaseModel';

interface ShareProfileArgs {
  username: string | null | undefined;
  name: string;
  isOwn: boolean;
}

/**
 * Share a public profile link: native share sheet when available (cancel is
 * a no-op, not a fallback), otherwise copy the link with a confirmation toast.
 */
export function useShareProfile({ username, name, isOwn }: ShareProfileArgs): () => Promise<void> {
  const { t, language } = useLanguage();
  const { canNativeShare, nativeShare } = useNativeShare();

  return useCallback(async () => {
    if (!username || typeof window === 'undefined') return;
    const url = buildProfileShareUrl(window.location.origin, language, username);
    if (canNativeShare) {
      await nativeShare({
        title: t('profile.showcase.shareTitle', { name: name || username }),
        text: isOwn ? t('profile.showcase.shareTextOwn') : t('profile.showcase.shareTextPublic', { name: name || username }),
        url,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('profile.showcase.linkCopied'));
    } catch {
      toast.error(t('profile.showcase.shareFailed'));
    }
  }, [username, name, isOwn, language, t, canNativeShare, nativeShare]);
}

export default useShareProfile;
