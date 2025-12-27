'use client';

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy, FaWhatsapp, FaTrophy, FaFire } from 'react-icons/fa';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp, generatePersonalizedShareMessage, type GameResultForShare } from '@/utils/share';
import { useNativeShare } from '@/hooks/useNativeShare';

/**
 * Share context determines the modal's appearance and behavior
 */
type ShareContext = 'pre-game' | 'post-game';

interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameCode: string;
  roomName?: string;
  t: (key: string) => string;
  /** Context determines styling and content */
  context?: ShareContext;
  /** Post-game stats (only used when context='post-game') */
  gameResult?: GameResultForShare;
  /** Language for personalized messages */
  language?: string;
  /** Witty message to display (optional, auto-generated if not provided) */
  wittyMessage?: string;
}

/**
 * UnifiedShareModal - Single modal for ALL share contexts
 *
 * Supports both pre-game (room code sharing) and post-game (victory sharing).
 * Simplified to 2 primary actions: Copy Link + WhatsApp
 *
 * Design: Neo-brutalist with hard shadows, consistent across contexts
 */
const UnifiedShareModal: React.FC<UnifiedShareModalProps> = ({
  isOpen,
  onClose,
  gameCode,
  roomName = '',
  t,
  context = 'pre-game',
  gameResult,
  language = 'en',
  wittyMessage,
}) => {
  const { canNativeShare, nativeShare } = useNativeShare();
  const isPostGame = context === 'post-game';
  const joinUrl = getJoinUrl(gameCode, isPostGame ? 'share-win' : 'modal-share');

  // Generate share message for post-game context
  const shareMessage = useMemo(() => {
    if (!isPostGame || !gameResult) {
      return `🎮 ${t('share.inviteTitle')}\n${t('share.inviteMessage')}\n${joinUrl}`;
    }
    return generatePersonalizedShareMessage(gameCode, gameResult, language, 'modal');
  }, [isPostGame, gameResult, gameCode, language, joinUrl, t]);

  const handleCopyLink = useCallback(async () => {
    await copyJoinUrl(gameCode, t, isPostGame ? 'share-win-copy' : 'copy');
  }, [gameCode, t, isPostGame]);

  const handleWhatsApp = useCallback(() => {
    if (isPostGame && gameResult) {
      // Use personalized message for post-game
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      shareViaWhatsApp(gameCode, roomName, t);
    }
  }, [gameCode, roomName, t, isPostGame, gameResult, shareMessage]);

  const handleNativeShare = useCallback(async () => {
    const success = await nativeShare({
      title: isPostGame ? 'LexiClash Victory!' : t('share.inviteTitle'),
      text: shareMessage,
      url: joinUrl,
    });
    if (success) {
      onClose();
    }
  }, [nativeShare, joinUrl, shareMessage, isPostGame, t, onClose]);

  // Determine header color based on context
  const headerColor = isPostGame ? 'bg-neo-yellow' : 'bg-neo-pink';
  const headerTextColor = 'text-neo-black';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-4 border-neo-black rounded-neo shadow-hard-xl p-0 overflow-hidden">
        {/* Header - Context-aware */}
        <div className={cn(
          'border-b-4 border-neo-black p-4 flex items-center justify-center gap-2',
          headerColor
        )}>
          {isPostGame && <FaTrophy className="text-xl text-neo-black" />}
          <DialogTitle className={cn('text-lg font-black uppercase', headerTextColor)}>
            {isPostGame ? t('share.shareVictory') || 'Share Your Victory!' : t('share.modalTitle')}
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Post-game Stats Display */}
          {isPostGame && gameResult && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              {/* Witty Message */}
              {wittyMessage && (
                <p className="text-center text-white font-bold text-sm px-2 italic">
                  &ldquo;{wittyMessage}&rdquo;
                </p>
              )}

              {/* Stats Row */}
              <div className="flex items-center justify-center gap-4 p-3 rounded-neo border-2 border-white/20 bg-black/30">
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-neo-yellow">
                    {gameResult.score}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                    {language === 'he' ? 'נקודות' : 'pts'}
                  </div>
                </div>
                <div className="w-0.5 h-10 rounded-full bg-white/20" />
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-neo-cyan">
                    {gameResult.wordCount}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                    {language === 'he' ? 'מילים' : 'words'}
                  </div>
                </div>
                {gameResult.streakDays && gameResult.streakDays > 1 && (
                  <>
                    <div className="w-0.5 h-10 rounded-full bg-white/20" />
                    <div className="text-center px-3">
                      <div className="text-2xl font-black text-orange-400 flex items-center gap-1">
                        <FaFire /> {gameResult.streakDays}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                        {language === 'he' ? 'רצף' : 'streak'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* QR Code - Prominent (hidden on mobile for post-game) */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              'flex flex-col items-center',
              isPostGame && 'hidden sm:flex' // Hide QR on mobile for post-game
            )}
          >
            <div className="bg-white text-neo-black p-4 rounded-neo border-3 border-neo-black shadow-hard-md">
              <QRCodeSVG
                value={joinUrl}
                size={isPostGame ? 140 : 180}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-white/70 mt-2 text-center">
              {t('share.scanQR')}
            </p>
          </motion.div>

          {/* Room Code Display */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            <div className="bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm">
              <span className="font-black text-xl text-neo-black tracking-wider">
                {gameCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo p-2 shadow-hard-sm hover:shadow-hard-md hover:-translate-y-0.5 transition-all"
              title={t('share.copyLink')}
            >
              <FaCopy className="text-neo-black" />
            </button>
          </motion.div>

          {/* Simplified Share Options - Only Copy + WhatsApp */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {/* Primary: Copy Link - Full Width */}
            <motion.button
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={handleCopyLink}
              className={cn(
                'w-full flex items-center justify-center gap-2 p-4 rounded-neo',
                'border-3 border-neo-black shadow-hard-md',
                'hover:shadow-hard-lg hover:-translate-y-1 active:shadow-hard-sm active:translate-y-0',
                'transition-all duration-150',
                'font-black text-base uppercase tracking-wide',
                'bg-neo-yellow text-neo-black'
              )}
            >
              <FaCopy className="text-lg" />
              <span>{t('share.copyLink')}</span>
            </motion.button>

            {/* Secondary: WhatsApp - Full Width */}
            <motion.button
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={handleWhatsApp}
              className={cn(
                'w-full flex items-center justify-center gap-2 p-3 rounded-neo',
                'border-2 border-neo-black shadow-hard-sm',
                'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                'transition-all duration-150',
                'font-bold text-sm uppercase tracking-wide',
                'bg-[#25D366] text-white'
              )}
            >
              <FaWhatsapp className="text-lg" />
              <span>{t('share.whatsapp')}</span>
            </motion.button>

            {/* Native Share (Mobile Only) */}
            {canNativeShare && (
              <motion.button
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.45 }}
                onClick={handleNativeShare}
                className={cn(
                  'w-full sm:hidden flex items-center justify-center gap-2 p-3 rounded-neo',
                  'border-2 border-white/30 shadow-hard-sm',
                  'hover:shadow-hard-md hover:-translate-y-0.5 transition-all',
                  'font-bold text-sm uppercase tracking-wide',
                  'bg-white/10 text-white hover:bg-white/20'
                )}
              >
                <span>{t('share.more') || 'More Options...'}</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedShareModal;
