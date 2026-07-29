import { useState, useCallback, useMemo } from 'react';
import { generateShareText, type ShareParams } from '@/shared/utils/shareResultGenerator';

type TFunction = (key: string) => string;

export function useShareResult(params: ShareParams, t: TFunction) {
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(() => generateShareText(params, t), [params, t]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      console.error('Failed to copy:', err);
    }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Share failed:', err);
      }
    }
  }, [shareText]);

  const handleWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  }, [shareText]);

  const handleTwitter = useCallback(() => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  }, [shareText]);

  return {
    shareText,
    copied,
    handleCopy,
    handleNativeShare,
    handleWhatsApp,
    handleTwitter,
  };
}
