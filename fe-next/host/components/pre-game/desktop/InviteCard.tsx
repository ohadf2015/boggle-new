'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, Maximize2, X } from 'lucide-react';
import { getJoinUrl, copyJoinUrl } from '../../../../utils/share';
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
  /** Desktop-optimized layout with better horizontal space usage */
  desktop?: boolean;
}

// ==================== Component ====================

export function InviteCard({
  gameCode,
  t,
  className,
  compact = false,
  desktop = false,
}: InviteCardProps): React.ReactElement {
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const joinUrl = getJoinUrl(gameCode);

  const handleCopyLink = useCallback(async () => {
    const success = await copyJoinUrl(gameCode, t);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [gameCode, t]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: t('share.title'),
        text: t('share.text', { code: gameCode }) || `Join my game with code: ${gameCode}`,
        url: joinUrl,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await handleCopyLink();
      }
    }
  }, [gameCode, joinUrl, t, handleCopyLink]);

  // Inline compact card — small QR with enlarge button + room code + copy
  return (
    <>
      <div
        data-testid="invite-card"
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-neo-lg border-2 border-neo-white/10 bg-neo-navy-light/50',
          className
        )}
      >
        {/* Small QR with enlarge overlay */}
        <button
          onClick={() => setQrExpanded(true)}
          className="relative shrink-0 group"
          aria-label={t('hostView.showQrCode')}
        >
          <div className="p-1.5 bg-white rounded-sm border-2 border-neo-black shadow-hard-sm">
            <QRCodeSVG
              value={joinUrl}
              size={48}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-neo-black/0 group-hover:bg-neo-black/40 rounded-sm transition-colors">
            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Room code */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase text-neo-cream/40 tracking-widest">
            {t('roomCode.title')}
          </p>
          <p className="text-xl font-black tracking-wider text-neo-lime font-neo-display">
            {gameCode}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 shrink-0">
          <motion.button
            data-testid="copy-link-button"
            onClick={handleCopyLink}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-neo border-2 border-neo-black transition-all',
              linkCopied
                ? 'bg-neo-lime text-neo-black'
                : 'bg-white/10 text-neo-cream hover:bg-white/20 shadow-hard-sm'
            )}
            aria-label={t('roomCode.copyLink')}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </motion.button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <motion.button
              data-testid="native-share-button"
              onClick={handleNativeShare}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm hover:shadow-none transition-all"
              aria-label={t('share.button')}
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Expanded QR Modal */}
      <AnimatePresence>
        {qrExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-90 flex items-center justify-center bg-neo-black/80"
            onClick={() => setQrExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative bg-neo-navy border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQrExpanded(false)}
                className="absolute top-2 end-2 w-8 h-8 flex items-center justify-center bg-neo-red border-2 border-neo-black rounded-neo shadow-hard-sm"
                aria-label={t('hostView.close')}
              >
                <X className="w-4 h-4 text-neo-black" />
              </button>

              <div className="flex flex-col items-center gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neo-cream/60">
                  {t('hostView.scanToJoin')}
                </h3>
                <div className="p-4 bg-white rounded-neo border-4 border-neo-black shadow-hard">
                  <QRCodeSVG
                    value={joinUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    title={t('share.qrCodeAlt', { code: gameCode })}
                  />
                </div>
                <p className="text-3xl font-black tracking-[0.2em] text-neo-lime font-neo-display">
                  {gameCode}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default InviteCard;
