'use client';

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Link2, Share2 } from 'lucide-react';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp, shareViaTelegram } from '../../../utils/share';
import { WhatsAppIcon, TelegramIcon } from '../../../components/icons/SocialIcons';
import { cn } from '../../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
 * MobileShareSection - Single share button that opens a modal with all share options.
 * Replaces the previous row of 3 buttons to save vertical screen space.
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
  const joinUrl = getJoinUrl(gameCode, 'mobile-lobby');

  const handleCopyLink = useCallback(async () => {
    const success = await copyJoinUrl(gameCode, t, 'mobile-lobby');
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [gameCode, t]);

  const handleWhatsAppShare = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const handleTelegramShare = useCallback(() => {
    const message = `${t('share.inviteMessage')}\n${t('share.code')}: ${gameCode}`;
    shareViaTelegram(message, joinUrl);
  }, [gameCode, joinUrl, t]);

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

  // Trigger button — single compact button
  const triggerButton = (
    <DialogTrigger asChild>
      <motion.button
        data-testid="mobile-share-trigger"
        whileTap={{ scale: 0.95 }}
        className={cn(
          'flex items-center gap-1.5 rounded-full border-2 border-neo-black shadow-hard-sm transition-all font-bold text-neo-black bg-white',
          compact ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-xs',
          showHint && 'animate-neo-wobble',
        )}
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{t('share.invite')}</span>
      </motion.button>
    </DialogTrigger>
  );

  return (
    <div data-testid="mobile-share-section" className={cn('inline-flex', className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        {triggerButton}
        <DialogContent className="bg-neo-navy-light border-3 border-neo-black shadow-hard max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-neo-cream font-black uppercase text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-neo-cyan" />
              {t('hostView.inviteFriends')}
            </DialogTitle>
          </DialogHeader>

          {/* Room code display */}
          <div className="text-center py-3 bg-neo-navy rounded-neo border-2 border-neo-white/10">
            <p className="text-[10px] font-bold uppercase text-neo-cream/50 tracking-widest mb-1">
              {t('roomCode.title')}
            </p>
            <p className="text-3xl font-black tracking-wider text-neo-lime">{gameCode}</p>
          </div>

          {/* Share options grid */}
          <div className="space-y-2">
            {/* Copy link — primary */}
            <motion.button
              data-testid="mobile-copy-link-button"
              onClick={handleCopyLink}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'w-full h-12 flex items-center justify-center gap-2 rounded-neo border-2 border-neo-black font-bold text-sm transition-all',
                copied
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-white text-neo-black shadow-hard-sm active:shadow-none active:translate-y-0.5'
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              <span>{copied ? t('common.copied') : t('share.copyLink')}</span>
            </motion.button>

            {/* Social row */}
            <div className="flex gap-2">
              <motion.button
                data-testid="mobile-whatsapp-button"
                onClick={handleWhatsAppShare}
                whileTap={{ scale: 0.95 }}
                aria-label="Share via WhatsApp"
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-neo border-2 border-neo-black bg-brand-whatsapp shadow-hard-sm text-sm font-bold text-white active:shadow-none active:translate-y-0.5"
              >
                <WhatsAppIcon size={16} />
                <span>WhatsApp</span>
              </motion.button>

              <motion.button
                data-testid="mobile-telegram-button"
                onClick={handleTelegramShare}
                whileTap={{ scale: 0.95 }}
                aria-label={`Share via ${t('share.telegram')}`}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-neo border-2 border-neo-black bg-brand-telegram text-white shadow-hard-sm text-sm font-bold active:shadow-none active:translate-y-0.5"
              >
                <TelegramIcon size={16} />
                <span>Telegram</span>
              </motion.button>
            </div>

            {/* Native share (if available) */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <motion.button
                onClick={handleNativeShare}
                whileTap={{ scale: 0.97 }}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm font-bold text-sm active:shadow-none active:translate-y-0.5"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('share.button')}</span>
              </motion.button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default MobileShareSection;
