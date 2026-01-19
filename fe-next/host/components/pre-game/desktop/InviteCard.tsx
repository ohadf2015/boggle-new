'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJoinUrl } from '../../../../utils/share';
import { cn } from '../../../../lib/utils';

// ==================== Types ====================

export interface InviteCardProps {
  /** Room code */
  gameCode: string;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Additional className */
  className?: string;
  /** Compact horizontal layout with smaller QR */
  compact?: boolean;
}

// ==================== Component ====================

/**
 * Invite card with QR code and share options
 *
 * Features:
 * - QR code for easy scanning (smaller in compact mode)
 * - Room code display
 * - Copy link button
 * - Share via native share API (if available)
 * - Compact horizontal layout option for space-constrained views
 */
export function InviteCard({
  gameCode,
  t,
  className,
  compact = false,
}: InviteCardProps): React.ReactElement {
  const [linkCopied, setLinkCopied] = useState(false);
  const joinUrl = getJoinUrl(gameCode);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setLinkCopied(true);
      toast.success(t('roomCode.linkCopied') || 'Link copied!', { duration: 1500, icon: '🔗' });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error(t('common.error') || 'Failed to copy');
    }
  }, [joinUrl, t]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      // Fallback to copy
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
      // User cancelled or share failed - fallback to copy
      if ((err as Error).name !== 'AbortError') {
        await handleCopyLink();
      }
    }
  }, [gameCode, joinUrl, t, handleCopyLink]);

  // Compact horizontal layout
  if (compact) {
    return (
      <div
        data-testid="invite-card"
        className={cn(
          'relative rounded-neo-lg border-4 border-neo-black overflow-hidden w-full max-w-md',
          'bg-gradient-to-br from-neo-pink/20 via-slate-800 to-neo-cyan/20',
          'shadow-hard',
          className
        )}
      >
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neo-cyan via-neo-lime to-neo-pink" />

        <div className="p-4 pt-5">
          {/* Horizontal layout: QR + Content */}
          <div className="flex items-center gap-4">
            {/* QR Code - smaller in compact mode */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-shrink-0 p-2 bg-white rounded-neo border-3 border-neo-black shadow-hard-sm"
            >
              <QRCodeSVG
                value={joinUrl}
                size={100}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Room Code */}
              <div className="mb-3">
                <p className="text-xs font-bold uppercase text-neo-cream/60 mb-0.5">
                  {t('roomCode.title') || 'Room Code'}
                </p>
                <p className="text-2xl font-black tracking-wider text-neo-lime">{gameCode}</p>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <motion.button
                  data-testid="copy-link-button"
                  onClick={handleCopyLink}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black text-sm font-bold transition-all',
                    linkCopied
                      ? 'bg-neo-lime text-neo-black shadow-none'
                      : 'bg-neo-navy hover:bg-neo-navy-light text-neo-cream shadow-hard-sm'
                  )}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('common.copied') || 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>{t('roomCode.copyLink') || 'Copy Link'}</span>
                    </>
                  )}
                </motion.button>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <motion.button
                    data-testid="native-share-button"
                    onClick={handleNativeShare}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard-sm hover:shadow-none transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard vertical layout
  return (
    <div
      data-testid="invite-card"
      className={cn(
        'relative rounded-neo-lg border-4 border-neo-black overflow-hidden w-full max-w-md',
        'bg-gradient-to-br from-neo-pink/20 via-slate-800 to-neo-cyan/20',
        'shadow-hard-lg',
        className
      )}
    >
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-neo-cyan via-neo-lime to-neo-pink" />

      <div className="p-6 pt-8">
        {/* Header */}
        <div className="text-center mb-4">
          <Share2 className="w-8 h-8 mx-auto text-neo-cyan mb-2" />
          <h2 className="text-xl font-black uppercase text-neo-cream">
            {t('hostView.inviteFriends') || 'Invite Friends'}
          </h2>
          <p className="text-sm text-neo-cream/60">
            {t('hostView.scanOrShare') || 'Scan QR code or share link'}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-white rounded-neo border-4 border-neo-black shadow-hard"
          >
            <QRCodeSVG
              value={joinUrl}
              size={160}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </motion.div>
        </div>

        {/* Room Code */}
        <div className="text-center mb-4">
          <p className="text-xs font-bold uppercase text-neo-cream/60 mb-1">
            {t('roomCode.title') || 'Room Code'}
          </p>
          <p className="text-3xl font-black tracking-wider text-neo-lime">{gameCode}</p>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <motion.button
            data-testid="copy-link-button"
            onClick={handleCopyLink}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-3 border-neo-black font-bold transition-all',
              linkCopied
                ? 'bg-neo-lime text-neo-black shadow-none'
                : 'bg-neo-navy hover:bg-neo-navy-light text-neo-cream shadow-hard-sm'
            )}
          >
            {linkCopied ? (
              <>
                <Check className="w-5 h-5" />
                <span>{t('common.copied') || 'Copied!'}</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-5 h-5" />
                <span>{t('roomCode.copyLink') || 'Copy Link'}</span>
              </>
            )}
          </motion.button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <motion.button
              data-testid="native-share-button"
              onClick={handleNativeShare}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard-sm hover:shadow-none transition-all"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InviteCard;
