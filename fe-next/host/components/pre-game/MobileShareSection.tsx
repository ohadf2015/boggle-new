'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Link, ChevronDown, MoreHorizontal, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getJoinUrl, shareViaWhatsApp, shareViaTelegram } from '../../../utils/share';
import { WhatsAppIcon, TelegramIcon } from '../../../components/icons/SocialIcons';
import { cn } from '../../../lib/utils';

// ==================== Types ====================

interface MobileShareSectionProps {
  /** Room code to share */
  gameCode: string;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Additional className */
  className?: string;
  /** Callback when "More" button is clicked to open share modal */
  onMoreShare?: () => void;
}

// ==================== Component ====================

/**
 * MobileShareSection - Enhanced compact share UI for mobile lobby
 *
 * Features:
 * - Join instructions text
 * - Prominent room code display
 * - Copy button for quick sharing
 * - WhatsApp and Telegram direct share buttons
 * - Collapsible QR code for easy scanning
 * - Native share button (on supported devices)
 * - Neo-brutalist styling matching the app design
 */
export const MobileShareSection = memo<MobileShareSectionProps>(function MobileShareSection({
  gameCode,
  t,
  className,
  onMoreShare,
}) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
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

  const handleWhatsAppShare = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const handleTelegramShare = useCallback(() => {
    const message = `${t('share.inviteMessage') || 'Join my LexiClash game!'}\n${t('share.code') || 'Code'}: ${gameCode}`;
    shareViaTelegram(message, joinUrl);
  }, [gameCode, joinUrl, t]);

  const handleMoreShare = useCallback(() => {
    if (onMoreShare) {
      onMoreShare();
    } else {
      // Fallback to native share or copy
      handleNativeShare();
    }
  }, [onMoreShare, handleNativeShare]);

  const toggleQR = useCallback(() => {
    setShowQR(prev => !prev);
  }, []);

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

      <div className="p-3 pt-4 space-y-3">
        {/* Instructions Banner */}
        <div
          data-testid="mobile-share-instructions"
          className="flex items-center gap-2 px-2 py-1.5 bg-neo-navy/50 rounded border border-neo-black/30"
        >
          <Link className="w-3.5 h-3.5 text-neo-cyan flex-shrink-0" />
          <p className="text-[11px] font-medium text-neo-cream/80">
            {t('share.joinInstructions') || 'Go to lexiclash.com and enter code'}
          </p>
        </div>

        {/* Room Code + Copy/Share Row */}
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

        {/* Social Share Buttons Row */}
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase text-neo-cream/50 flex-shrink-0">
            {t('share.orShareVia') || 'Or share via'}
          </p>

          <div className="flex-1 flex items-center gap-2">
            {/* WhatsApp Button */}
            <motion.button
              data-testid="mobile-whatsapp-button"
              onClick={handleWhatsAppShare}
              whileTap={{ scale: 0.95 }}
              aria-label="Share via WhatsApp"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black bg-brand-whatsapp text-white font-bold shadow-hard-sm hover:shadow-none active:shadow-none transition-all min-h-[44px]"
            >
              <WhatsAppIcon size={18} />
              <span className="text-xs sr-only sm:not-sr-only">WhatsApp</span>
            </motion.button>

            {/* Telegram Button */}
            <motion.button
              data-testid="mobile-telegram-button"
              onClick={handleTelegramShare}
              whileTap={{ scale: 0.95 }}
              aria-label={`Share via ${t('share.telegram') || 'Telegram'}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black bg-[#0088cc] text-white font-bold shadow-hard-sm hover:shadow-none active:shadow-none transition-all min-h-[44px]"
            >
              <TelegramIcon size={18} />
              <span className="text-xs sr-only sm:not-sr-only">{t('share.telegram') || 'Telegram'}</span>
            </motion.button>

            {/* More Options Button */}
            <motion.button
              data-testid="mobile-more-share-button"
              onClick={handleMoreShare}
              whileTap={{ scale: 0.95 }}
              aria-label={t('share.moreWays') || 'More ways to share'}
              className="flex items-center justify-center p-2 rounded-neo border-2 border-neo-black bg-neo-navy hover:bg-neo-navy-light text-neo-cream shadow-hard-sm hover:shadow-none transition-all min-h-[44px] min-w-[44px]"
            >
              <MoreHorizontal className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* QR Code Toggle */}
        <motion.button
          data-testid="mobile-qr-toggle"
          onClick={toggleQR}
          aria-expanded={showQR}
          aria-controls="mobile-qr-section"
          className="w-full flex items-center justify-center gap-2 py-2 text-neo-cream/70 hover:text-neo-cream transition-colors"
        >
          <span className="text-xs font-medium">
            {showQR
              ? (t('share.hideQrCode') || 'Hide QR Code')
              : (t('share.showQrCode') || 'Show QR Code')
            }
          </span>
          <motion.div
            animate={{ rotate: showQR ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>

        {/* Collapsible QR Code Section */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              id="mobile-qr-section"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                {/* QR Code */}
                <div
                  data-testid="mobile-qr-code"
                  className="p-3 bg-white rounded-neo border-3 border-neo-black shadow-hard-sm"
                >
                  <QRCodeSVG
                    value={joinUrl}
                    size={120}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                {/* Scan instruction */}
                <p className="text-[11px] text-neo-cream/60 text-center">
                  {t('share.scanQrCode') || 'Scan to join instantly'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default MobileShareSection;
