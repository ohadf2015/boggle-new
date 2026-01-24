'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJoinUrl } from '../../../utils/share';
import { cn } from '../../../lib/utils';

// ==================== Types ====================

interface MobileShareSectionProps {
  /** Room code to share */
  gameCode: string;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Additional className */
  className?: string;
}

// ==================== Component ====================

/**
 * MobileShareSection - Compact share UI for mobile lobby
 *
 * Features:
 * - Prominent room code display
 * - Copy button for quick sharing
 * - Native share button (on supported devices)
 * - Neo-brutalist styling matching the app design
 */
export const MobileShareSection = memo<MobileShareSectionProps>(function MobileShareSection({
  gameCode,
  t,
  className,
}) {
  const [copied, setCopied] = useState(false);
  const joinUrl = getJoinUrl(gameCode, 'mobile-lobby');

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success(t('roomCode.linkCopied') || 'Link copied!', { duration: 1500, icon: '🔗' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common.error') || 'Failed to copy');
    }
  }, [joinUrl, t]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: t('share.title') || 'Join my LexiClash game!',
        text: t('share.text', { code: gameCode }) || `Join my game with code: ${gameCode}`,
        url: joinUrl,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await handleCopyLink();
      }
    }
  }, [gameCode, joinUrl, t, handleCopyLink]);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      data-testid="mobile-share-section"
      className={cn(
        'relative rounded-neo border-3 border-neo-black overflow-hidden',
        'bg-gradient-to-r from-neo-pink/20 via-neo-navy to-neo-cyan/20',
        'shadow-hard-sm',
        className
      )}
    >
      {/* Decorative accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neo-cyan via-neo-lime to-neo-pink" />

      <div className="p-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          {/* Room Code Display */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase text-neo-cream/60 mb-0.5">
              {t('roomCode.title') || 'Room Code'}
            </p>
            <p className="text-2xl font-black tracking-wider text-neo-lime truncate">
              {gameCode}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Copy Button */}
            <motion.button
              data-testid="mobile-copy-link-button"
              onClick={handleCopyLink}
              whileTap={{ scale: 0.95 }}
              aria-label={t('roomCode.copyLink') || 'Copy link'}
              className={cn(
                'flex items-center justify-center p-2.5 rounded-neo border-2 border-neo-black transition-all min-h-[44px] min-w-[44px]',
                copied
                  ? 'bg-neo-lime text-neo-black shadow-none'
                  : 'bg-neo-navy hover:bg-neo-navy-light text-neo-cream shadow-hard-sm active:shadow-none'
              )}
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </motion.button>

            {/* Share Button - Primary action */}
            {canNativeShare && (
              <motion.button
                data-testid="mobile-native-share-button"
                onClick={handleNativeShare}
                whileTap={{ scale: 0.95 }}
                aria-label={t('share.buttonLabel') || 'Share'}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard-sm hover:shadow-hard active:shadow-none transition-all min-h-[44px]"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm">{t('share.buttonLabel') || 'Share'}</span>
              </motion.button>
            )}

            {/* Fallback: If no native share, make copy button more prominent */}
            {!canNativeShare && (
              <motion.button
                data-testid="mobile-share-fallback-button"
                onClick={handleCopyLink}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-neo border-2 border-neo-black font-bold transition-all min-h-[44px]',
                  copied
                    ? 'bg-neo-lime text-neo-black shadow-none'
                    : 'bg-neo-yellow text-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span className="text-sm">{t('common.copied') || 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span className="text-sm">{t('roomCode.copyLink') || 'Copy Link'}</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MobileShareSection;
