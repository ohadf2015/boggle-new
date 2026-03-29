'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Link2, Copy } from 'lucide-react';
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
 * MobileShareSection - Share strip with room code + share buttons
 * When showHint is true, displays a prominent invite banner for empty rooms
 */
export const MobileShareSection = memo<MobileShareSectionProps>(function MobileShareSection({
  gameCode,
  t,
  className,
  showHint = false,
}) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const joinUrl = getJoinUrl(gameCode, 'mobile-lobby');

  const handleCopyLink = useCallback(async () => {
    const success = await copyJoinUrl(gameCode, t, 'mobile-lobby');
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [gameCode, t]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(gameCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [gameCode]);

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
      {/* Hint banner for empty rooms */}
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-cyan/10 border-2 border-neo-cyan/30 rounded-neo px-4 py-3 text-center"
        >
          <p className="text-sm font-bold text-neo-cyan">
            {t('hostView.waitingForFriendsHint')}
          </p>
        </motion.div>
      )}

      {/* Room Code Display */}
      <div className="flex items-center justify-between bg-neo-navy-light/80 border-2 border-neo-black rounded-neo px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t('hostView.roomCode')}
          </span>
          <span className="text-2xl font-neo-display font-black text-neo-lime tracking-wider">
            {gameCode}
          </span>
        </div>
        <button
          onClick={handleCopyCode}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black text-xs font-bold transition-all',
            codeCopied
              ? 'bg-neo-lime text-neo-black'
              : 'bg-white/10 text-neo-cream hover:bg-white/20'
          )}
        >
          {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{codeCopied ? t('common.copied') : t('roomCode.copy')}</span>
        </button>
      </div>

      {/* Instruction text */}
      <p className="text-xs text-slate-400 px-1">
        {t('hostView.sendLinkToFriends')}
      </p>

      {/* Share buttons */}
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
          className="h-11 px-3 flex items-center justify-center rounded-full border-2 border-neo-black bg-brand-telegram text-white shadow-hard-sm transition-all"
        >
          <TelegramIcon size={16} />
        </motion.button>
      </div>
    </div>
  );
});

export default MobileShareSection;
