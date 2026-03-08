'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJoinUrl, shareViaWhatsApp, shareViaTelegram } from '../../../utils/share';
import { WhatsAppIcon, TelegramIcon } from '../../../components/icons/SocialIcons';
import { cn } from '../../../lib/utils';

// ==================== Types ====================

interface MobileShareSectionProps {
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ==================== Component ====================

/**
 * MobileShareSection - Compact horizontal pill share strip
 * Layout: Copy Link | WhatsApp | Telegram (inline pills)
 * QR code is desktop-only (shown in InviteCard)
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
      toast.success(t('roomCode.linkCopied'), { duration: 1500, icon: '🔗' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common.error'));
    }
  }, [joinUrl, t]);

  const handleWhatsAppShare = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const handleTelegramShare = useCallback(() => {
    const message = `${t('share.inviteMessage')}\n${t('share.code')}: ${gameCode}`;
    shareViaTelegram(message, joinUrl);
  }, [gameCode, joinUrl, t]);

  return (
    <div
      data-testid="mobile-share-section"
      className={cn('space-y-2', className)}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">
        {t('hostView.inviteFriends')}
      </h3>

      {/* Compact Horizontal Pill Strip */}
      <div className="flex gap-2">
        {/* Copy Link */}
        <motion.button
          data-testid="mobile-copy-link-button"
          onClick={handleCopyLink}
          whileTap={{ scale: 0.95 }}
          aria-label={t('roomCode.copyLink')}
          className={cn(
            'h-11 px-4 flex items-center gap-2 rounded-full border-2 border-neo-black shadow-hard-sm transition-all text-xs font-bold',
            copied
              ? 'bg-neo-lime text-neo-black'
              : 'bg-white text-neo-black'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          <span>{copied ? (t('common.copied')) : (t('share.copyLink'))}</span>
        </motion.button>

        {/* WhatsApp */}
        <motion.button
          data-testid="mobile-whatsapp-button"
          onClick={handleWhatsAppShare}
          whileTap={{ scale: 0.95 }}
          aria-label="Share via WhatsApp"
          className="h-11 px-4 flex items-center gap-2 rounded-full border-2 border-neo-black bg-brand-whatsapp shadow-hard-sm transition-all text-xs font-bold text-white"
        >
          <WhatsAppIcon size={16} />
          <span>WhatsApp</span>
        </motion.button>

        {/* Telegram */}
        <motion.button
          data-testid="mobile-telegram-button"
          onClick={handleTelegramShare}
          whileTap={{ scale: 0.95 }}
          aria-label={`Share via ${t('share.telegram')}`}
          className="h-11 px-3 flex items-center justify-center rounded-full border-2 border-neo-black bg-[#0088cc] text-white shadow-hard-sm transition-all"
        >
          <TelegramIcon size={16} />
        </motion.button>
      </div>
    </div>
  );
});

export default MobileShareSection;
