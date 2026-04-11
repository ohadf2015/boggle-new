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

  // Invite card with "BRING YOUR SQUAD" header and prominent QR
  return (
    <>
      <div
        data-testid="invite-card"
        className={cn(
          'rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard overflow-hidden',
          className
        )}
      >
        {/* Accent bar */}
        <div className="h-1.5 bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime" />

        {/* "BRING YOUR SQUAD" header */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neo-pink font-neo-display">
            {t('hostView.bringYourSquad')}
          </h3>
        </div>

        <div className="px-4 pb-4 flex items-center gap-4">
          {/* QR with "SCAN TO JOIN" label + enlarge overlay */}
          <button
            onClick={() => setQrExpanded(true)}
            className="relative shrink-0 group flex flex-col items-center gap-1.5"
            aria-label={t('hostView.showQrCode')}
          >
            <div className="p-2 bg-white rounded-neo border-3 border-neo-black shadow-hard">
              <QRCodeSVG
                value={joinUrl}
                size={72}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-neo-cyan/60">
              {t('hostView.scanToJoin')}
            </span>
            <div className="absolute inset-0 flex items-center justify-center bg-neo-black/0 group-hover:bg-neo-black/40 rounded-neo transition-colors">
              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* Room code + actions */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase text-neo-cream/40 tracking-widest">
              {t('roomCode.title')}
            </p>
            <p className="text-2xl font-black tracking-[0.15em] text-neo-lime font-neo-display">
              {gameCode}
            </p>

            {/* Action buttons row */}
            <div className="flex gap-2 mt-2.5">
              <motion.button
                data-testid="copy-link-button"
                onClick={handleCopyLink}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'h-9 px-3 flex items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black text-xs font-bold uppercase transition-all',
                  linkCopied
                    ? 'bg-neo-lime text-neo-black'
                    : 'bg-white/10 text-neo-cream hover:bg-white/20 shadow-hard-sm'
                )}
                aria-label={t('roomCode.copyLink')}
              >
                {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{linkCopied ? t('roomCode.copied') : t('roomCode.copyLink')}</span>
              </motion.button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <motion.button
                  data-testid="native-share-button"
                  onClick={handleNativeShare}
                  whileTap={{ scale: 0.95 }}
                  className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm hover:shadow-none transition-all text-xs font-bold uppercase"
                  aria-label={t('share.button')}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('share.button')}</span>
                </motion.button>
              )}
            </div>
          </div>
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
