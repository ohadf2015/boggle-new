/**
 * SharePanel Component
 * Modal for sharing results on browsers without native share
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Send, ImageDown, Mail, MessageSquare, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { XTwitterIcon, WhatsAppIcon, LinkedInIcon, FacebookIcon } from './icons';

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  copied: boolean;
  onCopy: () => void;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onTelegram: () => void;
  onLinkedIn: () => void;
  onFacebook: () => void;
  onEmail: () => void;
  onSMS: () => void;
  onDownloadImage?: () => void;
  isGeneratingImage?: boolean;
  ogImageUrl?: string;
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
  onLinkedIn,
  onFacebook,
  onEmail,
  onSMS,
  onDownloadImage,
  isGeneratingImage,
  ogImageUrl,
  t,
}) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-2xl w-full my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4">{t('wordHunt.shareResult')}</h3>

            {/* OG Image Preview - Large and prominent */}
            {ogImageUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  {t('wordHunt.results.previewImage') || 'Preview Image'}
                </p>
                <div className="relative w-full rounded-neo border-3 border-neo-black overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {!imageLoaded && (
                    <div className="aspect-[1200/630] flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-neo-yellow/30 border-t-neo-yellow rounded-full animate-spin" />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ogImageUrl}
                    alt="Share preview"
                    className={`w-full h-auto ${imageLoaded ? 'block' : 'hidden'}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              </div>
            )}

            {/* Primary Share Options */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={onWhatsApp}
                className="py-3 bg-brand-whatsapp text-white border-3 border-neo-black rounded-neo hover:brightness-110"
              >
                <WhatsAppIcon className="mr-2 w-5 h-5" />
                WhatsApp
              </Button>

              <Button
                onClick={onTwitter}
                className="py-3 bg-black text-white border-3 border-gray-700 rounded-neo hover:bg-gray-900"
              >
                <XTwitterIcon className="mr-2 w-5 h-5" />
                X / Twitter
              </Button>

              <Button
                onClick={onFacebook}
                className="py-3 bg-brand-facebook text-white border-3 border-neo-black rounded-neo hover:brightness-110"
              >
                <FacebookIcon className="mr-2 w-5 h-5" />
                Facebook
              </Button>

              <Button
                onClick={onTelegram}
                className="py-3 bg-[#0088cc] text-white border-3 border-neo-black rounded-neo hover:brightness-110"
              >
                <Send className="mr-2 w-5 h-5" />
                Telegram
              </Button>
            </div>

            {/* More Options Toggle */}
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {showMoreOptions ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t('wordHunt.results.lessOptions') || 'Less options'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('wordHunt.results.moreOptions') || 'More options'}
                </>
              )}
            </button>

            {/* Secondary Share Options */}
            <AnimatePresence>
              {showMoreOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <Button
                      onClick={onLinkedIn}
                      className="py-3 bg-brand-linkedin text-white border-3 border-neo-black rounded-neo hover:brightness-110"
                    >
                      <LinkedInIcon className="mr-2 w-5 h-5" />
                      LinkedIn
                    </Button>

                    <Button
                      onClick={onEmail}
                      className="py-3 bg-gray-600 text-white border-3 border-neo-black rounded-neo hover:bg-gray-700"
                    >
                      <Mail className="mr-2 w-5 h-5" />
                      {t('share.email') || 'Email'}
                    </Button>

                    <Button
                      onClick={onSMS}
                      className="py-3 bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo hover:brightness-110"
                    >
                      <MessageSquare className="mr-2 w-5 h-5" />
                      {t('share.sms') || 'SMS'}
                    </Button>

                    <Button
                      onClick={onCopy}
                      className="py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-3 border-neo-black rounded-neo"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 w-5 h-5 text-neo-lime" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 w-5 h-5" />
                          {t('daily.copyLink') || 'Copy Link'}
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download Image Button */}
            {onDownloadImage && (
              <div className="mt-4">
                <Button
                  onClick={onDownloadImage}
                  disabled={isGeneratingImage}
                  className="w-full py-3 bg-neo-pink text-white border-3 border-neo-black rounded-neo disabled:opacity-50 hover:brightness-110"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="mr-2 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('wordHunt.results.generating') || 'Generating...'}
                    </>
                  ) : (
                    <>
                      <ImageDown className="mr-2 w-5 h-5" />
                      {t('daily.downloadImage') || 'Download Image'}
                    </>
                  )}
                </Button>
              </div>
            )}

            <Button onClick={onClose} variant="ghost" className="w-full mt-4">
              {t('daily.close')}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
