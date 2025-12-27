'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { FaCopy, FaWhatsapp, FaTelegram, FaShareAlt } from 'react-icons/fa';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp, shareViaTelegram } from '@/utils/share';
import { useNativeShare } from '@/hooks/useNativeShare';

interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameCode: string;
  roomName?: string;
  t: (key: string) => string;
}

/**
 * UnifiedShareModal - Single modal with all share options + QR code
 * Designed to be triggered from a single "Share" button
 */
const UnifiedShareModal: React.FC<UnifiedShareModalProps> = ({
  isOpen,
  onClose,
  gameCode,
  roomName = '',
  t,
}) => {
  const { canNativeShare, nativeShare } = useNativeShare();
  const joinUrl = getJoinUrl(gameCode, 'modal-share');

  const handleCopyLink = useCallback(async () => {
    await copyJoinUrl(gameCode, t, 'copy');
  }, [gameCode, t]);

  const handleWhatsApp = useCallback(() => {
    shareViaWhatsApp(gameCode, roomName, t);
  }, [gameCode, roomName, t]);

  const handleTelegram = useCallback(() => {
    const message = `🎮 ${t('share.inviteTitle')}\n${t('share.inviteMessage')}`;
    shareViaTelegram(message, joinUrl);
  }, [joinUrl, t]);

  const handleNativeShare = useCallback(async () => {
    const success = await nativeShare({
      title: t('share.inviteTitle'),
      text: t('share.inviteMessage'),
      url: joinUrl,
    });
    if (success) {
      onClose();
    }
  }, [nativeShare, joinUrl, t, onClose]);

  const shareButtons = [
    {
      id: 'copy',
      icon: FaCopy,
      label: t('share.copyLink'),
      color: 'bg-neo-cyan text-neo-black',
      onClick: handleCopyLink,
    },
    {
      id: 'whatsapp',
      icon: FaWhatsapp,
      label: t('share.whatsapp'),
      color: 'bg-green-500',
      onClick: handleWhatsApp,
    },
    {
      id: 'telegram',
      icon: FaTelegram,
      label: t('share.telegram'),
      color: 'bg-sky-500',
      onClick: handleTelegram,
    },
    ...(canNativeShare
      ? [
          {
            id: 'more',
            icon: FaShareAlt,
            label: t('share.more'),
            color: 'bg-neo-purple',
            onClick: handleNativeShare,
          },
        ]
      : []),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-4 border-neo-black rounded-neo shadow-hard-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-neo-pink text-white border-b-4 border-neo-black p-4 flex items-center justify-center">
          <DialogTitle className="text-lg font-black text-neo-black uppercase">
            {t('share.modalTitle')}
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* QR Code - Prominent */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="bg-white text-neo-black p-4 rounded-neo border-3 border-neo-black shadow-hard-md">
              <QRCodeSVG
                value={joinUrl}
                size={180}
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

          {/* Share Options */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <p className="text-xs font-bold text-white/70 text-center uppercase">
              {t('share.orShareVia')}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {shareButtons.map((button, index) => {
                const Icon = button.icon;
                return (
                  <motion.button
                    key={button.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.35 + index * 0.05 }}
                    onClick={button.onClick}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-neo',
                      'border-2 border-neo-black shadow-hard-sm',
                      'hover:shadow-hard-md hover:-translate-y-0.5 transition-all',
                      'font-bold text-sm text-white',
                      button.color
                    )}
                  >
                    <Icon className="text-lg" />
                    <span>{button.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedShareModal;
