'use client';

import { useCallback, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { stripEmoji } from '@/lib/share/stripEmoji';

interface BridgeShareRowProps {
  shareText: string;
  onShareClick?: (method: 'native' | 'copy') => void;
}

const BTN =
  'flex flex-1 items-center justify-center gap-2 rounded-neo border-3 border-neo-black px-3 py-2.5 font-neo-display text-sm font-black shadow-hard-sm transition-transform active:translate-y-0.5';

/** Share + copy for the Word Bridge results — the paste text is the share artifact. */
export default function BridgeShareRow({ shareText, onShareClick }: BridgeShareRowProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const text = stripEmoji(shareText);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }, [text]);

  const handleCopy = useCallback(() => {
    onShareClick?.('copy');
    void copy();
  }, [copy, onShareClick]);

  const handleShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      handleCopy();
      return;
    }
    onShareClick?.('native');
    try {
      await navigator.share({ text });
    } catch { /* cancelled */ }
  }, [handleCopy, onShareClick, text]);

  return (
    <div data-testid="bridge-share-row" className="flex gap-2">
      <button type="button" onClick={handleShare} className={`${BTN} bg-neo-purple text-neo-white`}>
        <Share2 className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        {t('share.emojiCard.share')}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('share.emojiCard.copy')}
        className={`${BTN} bg-neo-cream text-neo-black`}
      >
        <Copy className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        {copied ? t('common.copied') : t('share.emojiCard.copy')}
      </button>
    </div>
  );
}
