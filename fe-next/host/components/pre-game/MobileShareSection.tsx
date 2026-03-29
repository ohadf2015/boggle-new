'use client';

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Link2, Users } from 'lucide-react';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp, shareViaTelegram } from '../../../utils/share';
import { WhatsAppIcon, TelegramIcon } from '../../../components/icons/SocialIcons';
import { cn } from '../../../lib/utils';

// ==================== Types ====================

interface MobileShareSectionProps {
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
  /** Show prominent hint banner for empty rooms */
  showHint?: boolean;
}

// ==================== Component ====================

/**
 * MobileShareSection - Share strip with invite CTA + share buttons
 * When showHint is true, displays a prominent invite call-to-action for empty rooms
 */
export const MobileShareSection = memo<MobileShareSectionProps>(function MobileShareSection({
  gameCode,
  t,
  className,
  showHint = false,
}) {
  const [copied, setCopied] = useState(false);
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

  return (
    <div
      data-testid="mobile-share-section"
      className={cn('space-y-3', className)}
    >
      {/* Invite call-to-action for empty rooms */}
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-cyan/10 border-2 border-neo-cyan/30 rounded-neo px-4 py-4 text-center"
        >
          <Users className="w-6 h-6 mx-auto text-neo-cyan mb-1.5" />
          <p className="text-sm font-bold text-neo-cyan">
            {t('hostView.waitingForFriendsHint')}
          </p>
          <p className="text-xs text-neo-cream/50 mt-1">
            {t('hostView.sendLinkToFriends')}
          </p>
        </motion.div>
      )}

      {/* Instruction text when players already present */}
      {!showHint && (
        <p className="text-xs text-slate-400 px-1">
          {t('hostView.sendLinkToFriends')}
        </p>
      )}

      {/* Share buttons */}
      <div className="flex gap-2">
        {/* Copy Link — primary action */}
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
          className="h-11 px-3 flex items-center justify-center rounded-full border-2 border-neo-black bg-brand-telegram text-white shadow-hard-sm transition-all"
        >
          <TelegramIcon size={16} />
        </motion.button>
      </div>
    </div>
  );
});

export default MobileShareSection;
