'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, Link2, Share2, Copy } from 'lucide-react';
import Image from 'next/image';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp } from '../../../utils/share';
import { WhatsAppIcon } from '../../../components/icons/SocialIcons';
import { cn } from '../../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';

// ==================== Types ====================

interface MobileShareSectionProps {
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
  /** Show prominent hint banner for empty rooms */
  showHint?: boolean;
  /** Compact single-row layout */
  compact?: boolean;
}

// ==================== Component ====================

/**
 * MobileShareSection - Inviting share modal with hero illustration.
 * Single trigger button opens a visually rich modal with room code + share options.
 */
export const MobileShareSection = memo<MobileShareSectionProps>(function MobileShareSection({
  gameCode,
  t,
  className,
  showHint = false,
  compact = false,
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const joinUrl = getJoinUrl(gameCode, 'mobile-lobby');

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleCopyLink = useCallback(async () => {
    const success = await copyJoinUrl(gameCode, t, 'mobile-lobby');
    if (success) {
      setCopied(true);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [gameCode, t]);

  const handleWhatsAppShare = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: t('share.inviteTitle'),
        text: `${t('share.inviteMessage')}\n${t('share.code')}: ${gameCode}`,
        url: joinUrl,
      });
    } catch {
      // User cancelled
    }
  }, [gameCode, joinUrl, t]);

  // Trigger button — primary CTA in lobby, brand lime color so it reads as
  // "do this next" not "optional extra". showHint adds wobble for empty rooms.
  const triggerButton = (
    <DialogTrigger asChild>
      <m.button
        data-testid="mobile-share-trigger"
        whileTap={{ scale: 0.95 }}
        className={cn(
          // Brand-lime CTA in both sizes so "invite" reads as the next action,
          // not a neutral chip lost among the header's exit/settings controls.
          'flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-lime text-neo-black font-black uppercase tracking-wide shadow-hard active:translate-y-0.5 active:shadow-hard-sm transition-all',
          compact ? 'h-8 px-3.5 text-xs' : 'h-10 px-4 text-sm',
          showHint && 'animate-neo-wobble',
        )}
      >
        <Share2 className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        <span>{t('share.invite')}</span>
      </m.button>
    </DialogTrigger>
  );

  return (
    <div data-testid="mobile-share-section" className={cn('inline-flex', className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        {triggerButton}
        <DialogContent
          noDescription
          className="bg-neo-navy border-3 border-neo-black shadow-hard-xl max-w-[340px] mx-auto p-0 overflow-hidden rounded-neo"
        >
          {/* Hero illustration */}
          <div className="relative w-full h-[140px] overflow-hidden border-b-3 border-neo-black">
            <Image
              src="/images/invite-hero.webp"
              alt=""
              fill
              className="object-cover"
              priority
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-linear-to-t from-neo-navy/80 via-transparent to-transparent" />
            {/* Title overlay */}
            <div className="absolute bottom-0 inset-x-0 p-3">
              <DialogTitle className="text-xl font-black text-white drop-shadow-lg font-neo-display">
                {t('share.modalTitle')}
              </DialogTitle>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Room code — tap to copy */}
            <m.button
              data-testid="invite-code-copy"
              onClick={handleCopyLink}
              whileTap={{ scale: 0.97 }}
              className="w-full group relative"
            >
              <div className={cn(
                'flex items-center justify-between px-4 py-3 rounded-neo border-3 transition-all',
                copied
                  ? 'border-neo-lime bg-neo-lime/10'
                  : 'border-neo-black bg-neo-navy-light hover:border-neo-lime/50'
              )}>
                <div className="text-start">
                  <p className="text-[10px] font-bold uppercase text-neo-cream/50 tracking-widest">
                    {t('roomCode.title')}
                  </p>
                  <p className="text-3xl font-black tracking-[0.2em] text-neo-lime font-neo-display">
                    {gameCode}
                  </p>
                </div>
                <AnimatePresence mode="wait">
                  {copied ? (
                    <m.div
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      className="w-10 h-10 rounded-full bg-neo-lime flex items-center justify-center"
                    >
                      <Check className="w-5 h-5 text-neo-black" />
                    </m.div>
                  ) : (
                    <m.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="w-10 h-10 rounded-full bg-neo-black/30 flex items-center justify-center group-hover:bg-neo-lime/20 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-neo-cream/70" />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </m.button>

            {/* Primary actions */}
            <div className="flex gap-2">
              {/* Copy Link */}
              <m.button
                data-testid="mobile-copy-link-button"
                onClick={handleCopyLink}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex-1 h-12 flex items-center justify-center gap-2 rounded-neo border-2 border-neo-black font-bold text-sm transition-all',
                  copied
                    ? 'bg-neo-lime text-neo-black'
                    : 'bg-white text-neo-black shadow-hard-sm active:shadow-none active:translate-y-0.5'
                )}
              >
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                <span>{copied ? t('common.copied') : t('share.copyLink')}</span>
              </m.button>

              {/* WhatsApp */}
              <m.button
                data-testid="mobile-whatsapp-button"
                onClick={handleWhatsAppShare}
                whileTap={{ scale: 0.95 }}
                aria-label="Share via WhatsApp"
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-neo border-2 border-neo-black bg-brand-whatsapp shadow-hard-sm text-sm font-bold text-white active:shadow-none active:translate-y-0.5"
              >
                <WhatsAppIcon size={18} />
                <span>WhatsApp</span>
              </m.button>
            </div>

            {/* Native share — full width, secondary style */}
            {canShare && (
              <m.button
                data-testid="mobile-native-share"
                onClick={handleNativeShare}
                whileTap={{ scale: 0.97 }}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-neo border-2 border-white/20 bg-white/5 text-neo-cream font-bold text-sm hover:bg-white/10 transition-colors active:translate-y-0.5"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('share.more')}</span>
              </m.button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default MobileShareSection;
