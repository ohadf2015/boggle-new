import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackShare } from '@/utils/growthTracking';

export interface ReferralShareState {
  referralCode: string | null;
  shareUrl: string;
  referralRewardXp: number;
  isLoading: boolean;
  copied: boolean;
  fetchShareData: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleShare: (platform: 'whatsapp' | 'telegram' | 'native') => Promise<void>;
}

export function useReferralShare(): ReferralShareState {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [referralRewardXp, setReferralRewardXp] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const fetchShareData = useCallback(async () => {
    if (!isAuthenticated) {
      setShareUrl(typeof window !== 'undefined' ? window.location.origin : '');
      setReferralCode(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/referral');
      if (res.ok) {
        const { data } = await res.json();
        setReferralCode(data.referralCode);
        setShareUrl(data.shareUrl);
        setReferralRewardXp(data.referralRewardXp);
      } else {
        setShareUrl(typeof window !== 'undefined' ? window.location.origin : '');
      }
    } catch {
      setShareUrl(typeof window !== 'undefined' ? window.location.origin : '');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackShare('copy');
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail — clipboard may be unavailable
    }
  }, [shareUrl]);

  const handleShare = useCallback(
    async (platform: 'whatsapp' | 'telegram' | 'native') => {
      if (!shareUrl) return;

      const shareText = referralCode
        ? t('landing.shareTextAuth', { code: referralCode })
        : t('landing.shareTextGuest');

      if (platform === 'native' && navigator.share) {
        try {
          await navigator.share({ title: t('landing.shareNativeTitle'), text: shareText, url: shareUrl });
          trackShare('native');
          return;
        } catch {
          // Fall through to URL-based share
        }
      }

      const shareUrls: Record<string, string> = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      };

      if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
        trackShare(platform as 'whatsapp' | 'telegram');
      }
    },
    [shareUrl, referralCode, t]
  );

  return { referralCode, shareUrl, referralRewardXp, isLoading, copied, fetchShareData, handleCopy, handleShare };
}
