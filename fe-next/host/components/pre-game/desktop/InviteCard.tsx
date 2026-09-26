'use client';

import React, { useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Share2 } from 'lucide-react';
import { getJoinUrl, copyJoinUrl } from '../../../../utils/share';
import { cn } from '../../../../lib/utils';

export interface InviteCardProps {
  gameCode: string;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
  className?: string;
  /** @deprecated one layout now. */
  compact?: boolean;
  /** @deprecated one layout now. */
  desktop?: boolean;
  /** Wobble + waiting hint when the room is empty. */
  showHint?: boolean;
  /** `panel` (desktop right column, card chrome) · `sheet` (inside the invite sheet, no card chrome). */
  variant?: 'panel' | 'sheet';
}

/**
 * The invite: a scannable QR, the room code big enough to read across a room,
 * the join address, and ONE SHARE (Web Share, clipboard fallback). On the lobby
 * panel SHARE is a lime-outline secondary — the footer START/READY is the one
 * solid-lime CTA; inside the invite sheet it is the only action, so it goes solid.
 * The code is display-only here — copying lives on the header code chip.
 */
export function InviteCard({ gameCode, t, className, showHint = false, variant = 'panel' }: InviteCardProps): React.ReactElement {
  const [linkCopied, setLinkCopied] = useState(false);
  const joinUrl = getJoinUrl(gameCode);
  const joinHost = joinUrl.replace(/^https?:\/\//, '').replace(/\?.*$/, '');

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
    } catch {
      /* share sheet dismissed */
    }
  }, [gameCode, joinUrl, t, handleCopyLink]);

  return (
    <div
      data-testid="invite-card"
      className={cn(
        'flex flex-col items-center gap-2 desktop-tall:gap-3 text-center',
        variant === 'panel' && 'rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard',
        showHint && 'animate-neo-wobble',
        className,
      )}
    >
      <p className="font-neo-display text-sm font-bold uppercase tracking-wider text-neo-lime">
        {t('mpUi.lobby.scanToJoin')}
      </p>
      <div className="rounded-neo border-3 border-neo-black bg-white p-2 shadow-hard">
        <QRCodeSVG
          value={joinUrl}
          size={200}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
          className="block w-[clamp(104px,19vh,200px)] h-[clamp(104px,19vh,200px)] tv:w-[min(300px,24vh)] tv:h-[min(300px,24vh)]"
          aria-label={t('hostView.scanToJoin')}
          role="img"
        />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-neo-white/60">{t('mpUi.lobby.orEnterCode')}</span>
        <span
          dir="ltr"
          data-testid="invite-code"
          className="font-neo-display font-bold uppercase leading-none tracking-[0.2em] text-neo-white text-[clamp(32px,6vh,56px)] tv:text-[64px] tv:tracking-[0.12em]"
        >
          {gameCode}
        </span>
        <span dir="ltr" className="text-xs font-bold text-neo-cyan truncate max-w-full">{joinHost}</span>
      </div>
      <button
        type="button"
        data-testid="native-share-button"
        onClick={handleNativeShare}
        aria-label={t('share.button')}
        className={cn(
          'w-full h-12 flex items-center justify-center gap-2 rounded-neo border-3',
          'font-neo-display text-base font-bold uppercase tracking-wider transition-transform',
          'hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
          variant === 'sheet'
            ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard'
            : 'border-neo-lime bg-neo-navy text-neo-lime shadow-hard-sm hover:bg-neo-lime/10',
        )}
      >
        {linkCopied ? <Check aria-hidden="true" className="w-5 h-5" /> : <Share2 aria-hidden="true" className="w-5 h-5" />}
        <span>{linkCopied ? t('roomCode.copied') : t('share.button')}</span>
      </button>
      {showHint && (
        <div data-testid="invite-empty-hint" aria-live="polite" className="text-xs font-bold uppercase tracking-widest text-neo-lime/80">
          {t('hostView.waitingForPlayers')}
        </div>
      )}
    </div>
  );
}

export default InviteCard;
