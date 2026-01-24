'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Link, ChevronDown, Send } from 'lucide-react';
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
        'relative rounded-neo border-2 border-neo-black overflow-hidden',
        'bg-gradient-to-r from-neo-pink/15 via-neo-navy to-neo-cyan/15',
        'shadow-hard-sm',
        className
      )}
    >
      {/* Decorative accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neo-cyan via-neo-lime to-neo-pink" />

      <div className="px-3 py-2 space-y-2">
        {/* Compact Room Code Row - Code + Actions inline */}
        <div className="flex items-center justify-between gap-2">
          {/* Room Code Display - Compact */}
          <div className="flex items-center gap-2 min-w-0">
            <Link className="w-3.5 h-3.5 text-neo-cyan flex-shrink-0" />
            <p className="text-lg font-black tracking-wider text-neo-lime truncate">
              {gameCode}
            </p>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Copy Button */}
            <motion.button
              data-testid="mobile-copy-link-button"
              onClick={handleCopyLink}
              whileTap={{ scale: 0.95 }}
              aria-label={t('roomCode.copyLink') || 'Copy link'}
              className={cn(
                'flex items-center justify-center p-2 rounded-neo border-2 border-neo-black transition-all',
                copied
                  ? 'bg-neo-lime text-neo-black shadow-none'
                  : 'bg-neo-navy hover:bg-neo-navy-light text-neo-cream shadow-hard-sm active:shadow-none'
              )}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </motion.button>

            {/* Share Button - Primary action */}
            {canNativeShare && (
              <motion.button
                data-testid="mobile-native-share-button"
                onClick={handleNativeShare}
                whileTap={{ scale: 0.95 }}
                aria-label={t('share.buttonLabel') || 'Share'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard-sm hover:shadow-hard active:shadow-none transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs">{t('share.buttonLabel') || 'Share'}</span>
              </motion.button>
            )}

            {/* Fallback: If no native share, make copy button more prominent */}
            {!canNativeShare && (
              <motion.button
                data-testid="mobile-share-fallback-button"
                onClick={handleCopyLink}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black font-bold transition-all',
                  copied
                    ? 'bg-neo-lime text-neo-black shadow-none'
                    : 'bg-neo-yellow text-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-xs">{t('common.copied') || 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">{t('roomCode.copyLink') || 'Copy'}</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Collapsible Share Options Toggle */}
        <motion.button
          data-testid="mobile-qr-toggle"
          onClick={toggleQR}
          aria-expanded={showQR}
          aria-controls="mobile-qr-section"
          className="w-full flex items-center justify-center gap-1.5 py-1 text-neo-cream/60 hover:text-neo-cream transition-colors"
        >
          <span className="text-[10px] font-medium">
            {showQR
              ? (t('share.hideShareOptions') || 'Hide options')
              : (t('share.moreWays') || 'More ways to share')
            }
          </span>
          <motion.div
            animate={{ rotate: showQR ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3" />
          </motion.div>
        </motion.button>

        {/* Collapsible Section - Social Buttons + QR Code */}
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
              <div className="space-y-3 pt-1 pb-2">
                {/* Instructions */}
                <div
                  data-testid="mobile-share-instructions"
                  className="flex items-center gap-2 px-2 py-1 bg-neo-navy/40 rounded border border-neo-black/20"
                >
                  <p className="text-[10px] text-neo-cream/70">
                    {t('share.joinInstructions') || 'Go to lexiclash.com and enter code'}
                  </p>
                </div>

                {/* Social Share Buttons Row */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp Button */}
                  <motion.button
                    data-testid="mobile-whatsapp-button"
                    onClick={handleWhatsAppShare}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Share via WhatsApp"
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-neo border-2 border-neo-black bg-brand-whatsapp text-white font-bold shadow-hard-sm active:shadow-none transition-all"
                  >
                    <WhatsAppIcon size={16} />
                    <span className="text-xs">WhatsApp</span>
                  </motion.button>

                  {/* Telegram Button */}
                  <motion.button
                    data-testid="mobile-telegram-button"
                    onClick={handleTelegramShare}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Share via ${t('share.telegram') || 'Telegram'}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-neo border-2 border-neo-black bg-[#0088cc] text-white font-bold shadow-hard-sm active:shadow-none transition-all"
                  >
                    <TelegramIcon size={16} />
                    <span className="text-xs">{t('share.telegram') || 'Telegram'}</span>
                  </motion.button>

                  {/* More Options Button */}
                  <motion.button
                    data-testid="mobile-more-share-button"
                    onClick={handleMoreShare}
                    whileTap={{ scale: 0.95 }}
                    aria-label={t('share.moreWays') || 'More ways to share'}
                    className="flex items-center justify-center p-2 rounded-neo border-2 border-neo-black bg-neo-navy hover:bg-neo-navy-light text-neo-cream shadow-hard-sm transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    data-testid="mobile-qr-code"
                    className="p-2 bg-white rounded-neo border-2 border-neo-black shadow-hard-sm"
                  >
                    <QRCodeSVG
                      value={joinUrl}
                      size={100}
                      level="H"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <p className="text-[10px] text-neo-cream/50 text-center">
                    {t('share.scanQrCode') || 'Scan to join instantly'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default MobileShareSection;
