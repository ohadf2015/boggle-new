/**
 * SharePanel Component
 * Modal for sharing results on browsers without native share
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { XTwitterIcon, WhatsAppIcon } from './icons';

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  copied: boolean;
  onCopy: () => void;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onTelegram: () => void;
  t: (key: string) => string;
}

export const SharePanel: React.FC<SharePanelProps> = ({
  isOpen,
  onClose,
  copied,
  onCopy,
  onWhatsApp,
  onTwitter,
  onTelegram,
  t,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4">{t('wordHunt.shareResult')}</h3>

            <div className="space-y-3">
              <Button
                onClick={onWhatsApp}
                className="w-full py-3 bg-[#25D366] text-white border-3 border-neo-black rounded-neo"
              >
                <WhatsAppIcon className="mr-2 w-5 h-5" />
                WhatsApp
              </Button>

              <Button
                onClick={onTwitter}
                className="w-full py-3 bg-black text-white border-3 border-gray-700 rounded-neo"
              >
                <XTwitterIcon className="mr-2 w-5 h-5" />
                X / Twitter
              </Button>

              <Button
                onClick={onTelegram}
                className="w-full py-3 bg-[#0088cc] text-white border-3 border-neo-black rounded-neo"
              >
                <Send className="mr-2 w-5 h-5" />
                Telegram
              </Button>

              <Button
                onClick={onCopy}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-3 border-neo-black rounded-neo"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 w-5 h-5 text-neo-lime" />
                    {t('common.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 w-5 h-5" />
                    {t('daily.copyToClipboard')}
                  </>
                )}
              </Button>
            </div>

            <Button onClick={onClose} variant="ghost" className="w-full mt-4">
              {t('daily.close')}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
