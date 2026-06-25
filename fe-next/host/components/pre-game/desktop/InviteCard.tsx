'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
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
  /** Wobble + waiting hint when room is empty (UX audit 2026-05-04 #4) */
  showHint?: boolean;
}

// ==================== Component ====================

export function InviteCard({
  gameCode,
  t,
  className,
  showHint = false,
}: InviteCardProps): React.ReactElement {
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
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

  const qrModal = (
    <>
      {qrExpanded && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-neo-black/80 animate-in fade-in-0 duration-300"
          onClick={() => setQrExpanded(false)}
        >
          <div
            className="relative bg-neo-navy border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 max-w-xs animate-in fade-in-0 zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrExpanded(false)}
              className="absolute top-2 end-2 w-8 h-8 flex items-center justify-center bg-neo-red border-2 border-neo-black rounded-neo shadow-hard-sm"
              aria-label={t('hostView.close')}
            >
              <X className="w-4 h-4 text-neo-black" />
            </button>
            <div className="flex flex-col items-center gap-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neo-cream/60">
                {t('hostView.scanToJoin')}
              </h3>
              <div className="p-4 bg-white rounded-neo border-4 border-neo-black shadow-hard-lg">
                <QRCodeSVG
                  value={joinUrl}
                  size={250}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  title={t('share.qrCodeAlt', { code: gameCode })}
                />
              </div>
              <p className="text-3xl font-black tracking-[0.2em] text-neo-lime font-neo-display animate-pulse-code">
                {gameCode}
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    'flex-1 h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-neo-black text-xs font-bold uppercase tracking-widest transition-all',
                    linkCopied
                      ? 'bg-neo-lime text-neo-black'
                      : 'bg-neo-navy-light text-neo-cream hover:bg-white/10 shadow-hard'
                  )}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{linkCopied ? t('roomCode.copied') : t('roomCode.copyLink')}</span>
                </button>
                <button
                  onClick={() => setQrExpanded(false)}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg border-3 border-neo-black bg-neo-lime text-neo-black text-sm font-black uppercase tracking-wider shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>{t('hostView.letsGo')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Invite card with hero illustration header + prominent CTAs
  return (
    <>
      <div
        data-testid="invite-card"
        className={cn(
          'rounded-neo-lg border-3 border-neo-lime/60 bg-slate-800/90 shadow-hard-lg overflow-hidden ring-2 ring-neo-lime/20',
          showHint && 'animate-neo-wobble',
          className
        )}
      >
        {/* Hero illustration header — kawaii squad illustration sets the
            "play with friends" mood. Drives invite-action prominence by
            making the card feel like a feature, not a settings strip. */}
        <div className="relative w-full h-[120px] overflow-hidden border-b-3 border-neo-black">
          <Image
            src="/images/invite-hero.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 py-2.5">
            <p className="text-base font-black uppercase tracking-widest text-neo-lime drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] font-neo-display">
              {t('hostView.bringYourSquad')}
            </p>
          </div>
        </div>

        {/* Compact horizontal row: QR thumbnail + code | COPY LINK | Share */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* QR thumbnail + room code */}
          <button
            onClick={() => setQrExpanded(true)}
            className="relative shrink-0 group flex items-center gap-3 px-3 py-2 bg-white border-2 border-neo-black rounded-lg shadow-hard hover:scale-105 transition-transform"
            aria-label={t('hostView.showQrCode')}
          >
            <div className="w-16 h-16 shrink-0">
              <QRCodeSVG
                value={joinUrl}
                size={64}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
                className="w-full h-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-neo-display text-base text-neo-black tracking-widest leading-none font-black">
                {gameCode}
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase flex items-center gap-0.5 mt-1">
                <Maximize2 className="w-2.5 h-2.5" /> {t('hostView.scanToJoin')}
              </span>
            </div>
          </button>

          {/* SHARE button — single primary lobby CTA (lime). Uses Web Share API
              when available, falls back to clipboard copy otherwise. Replaces
              the prior copy-link + share split per UX audit 2026-05-04. */}
          <button
            data-testid="native-share-button"
            onClick={handleNativeShare}
            className={cn(
              'flex-1 h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-neo-black text-xs font-black uppercase tracking-widest transition-all shadow-hard',
              linkCopied
                ? 'bg-neo-lime text-neo-black'
                : 'bg-neo-lime text-neo-black hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-y-0.5'
            )}
            aria-label={t('share.button')}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{linkCopied ? t('roomCode.copied') : t('share.button')}</span>
          </button>
        </div>

        {showHint && (
          <div
            data-testid="invite-empty-hint"
            aria-live="polite"
            className="px-4 pb-3 text-xs font-bold uppercase tracking-widest text-neo-lime/80"
          >
            {t('hostView.waitingForPlayers')}
          </div>
        )}
      </div>

      {mounted ? createPortal(qrModal, document.body) : null}
    </>
  );
}

export default InviteCard;
