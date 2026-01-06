/**
 * ShareSection Component
 * Share buttons section with platform-specific sharing options
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Send, RotateCcw, ImageDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { XTwitterIcon, WhatsAppIcon } from './icons';

export interface ShareSectionProps {
  solved: boolean;
  onShare: () => void;
  onRetry: () => void;
  canAffordRetry: boolean;
  retryCost: number;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onTelegram: () => void;
  onCopy: () => void;
  onDownloadImage: () => void;
  copied: boolean;
  isGeneratingImage: boolean;
  t: (key: string) => string;
}

export const ShareSection: React.FC<ShareSectionProps> = ({
  solved,
  onShare,
  onRetry,
  canAffordRetry,
  retryCost,
  onWhatsApp,
  onTwitter,
  onTelegram,
  onCopy,
  onDownloadImage,
  copied,
  isGeneratingImage,
  t,
}) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    className="space-y-3"
  >
    {/* Primary share button */}
    <Button
      onClick={onShare}
      className={cn(
        "w-full py-3.5 text-lg font-black uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all",
        solved
          ? "bg-gradient-to-r from-neo-yellow via-neo-yellow to-neo-pink text-neo-black"
          : "bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-pink text-white"
      )}
    >
      <Share2 className="mr-2 w-5 h-5" />
      {t('wordHunt.results.share') || 'Share'}
    </Button>

    {/* Platform buttons - always visible, icon-focused */}
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onWhatsApp}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon className="w-5 h-5" />
      </button>
      <button
        onClick={onTwitter}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-black text-white border-2 border-gray-700 shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label="Share on X/Twitter"
      >
        <XTwitterIcon className="w-5 h-5" />
      </button>
      <button
        onClick={onTelegram}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label="Share on Telegram"
      >
        <Send className="w-5 h-5" />
      </button>
      <button
        onClick={onCopy}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-600 text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
        aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
      >
        {copied ? <Check className="w-5 h-5 text-neo-lime" /> : <Copy className="w-5 h-5" />}
      </button>
      <button
        onClick={onDownloadImage}
        disabled={isGeneratingImage}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-neo-pink text-white border-2 border-neo-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all disabled:opacity-50"
        aria-label={t('daily.downloadImage')}
      >
        {isGeneratingImage ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <ImageDown className="w-5 h-5" />
        )}
      </button>
    </div>

    {/* Retry button - subtle for solved players, prominent for failed */}
    <Button
      onClick={onRetry}
      disabled={!canAffordRetry}
      className={cn(
        "w-full py-2 text-sm uppercase border-2 rounded-neo transition-all",
        solved
          ? "font-medium bg-transparent border-gray-400 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-none"
          : canAffordRetry
            ? "font-black bg-gradient-to-r from-amber-400 to-orange-500 text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5"
            : "font-black bg-gray-400 text-gray-600 border-neo-black cursor-not-allowed shadow-hard"
      )}
    >
      <RotateCcw className="mr-1.5 w-4 h-4" />
      <span className="flex items-center gap-1">
        {t('wordHunt.results.retry') || 'Retry'}
        <span className="text-xs opacity-70">({retryCost}🪙)</span>
      </span>
    </Button>
  </motion.div>
);

export default ShareSection;
