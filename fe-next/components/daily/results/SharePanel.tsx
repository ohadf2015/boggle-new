/**
 * SharePanel Component
 * Modal for sharing results on browsers without native share
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Copy, Check, Send, ImageDown, Mail, MessageSquare, ExternalLink, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { XTwitterIcon, WhatsAppIcon, LinkedInIcon, FacebookIcon } from './icons';
import { Loader } from '@/components/ui/Loader';

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
  onDownloadStreakCard?: () => void;
  isGeneratingImage?: boolean;
  isGeneratingStreakCard?: boolean;
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
  onDownloadStreakCard,
  isGeneratingImage,
  isGeneratingStreakCard,
  ogImageUrl,
  t,
}) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto overscroll-contain scrollable-area animate-in fade-in-0 duration-300"
          onClick={onClose}
        >
          <div
            className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-2xl w-full my-4 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4">{t('wordHunt.shareResult')}</h3>

            {/* OG Image Preview - Large and prominent */}
            {ogImageUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  {t('wordHunt.results.previewImage')}
                </p>
                <div className="relative w-full rounded-neo border-3 border-neo-black overflow-hidden bg-gray-100 dark:bg-neo-navy-light">
                  {!imageLoaded && (
                    <div className="aspect-1200/630 flex items-center justify-center">
                      <Loader size="sm" />
                    </div>
                  )}
                  <Image
                    src={ogImageUrl}
                    alt="Share preview"
                    width={1200}
                    height={630}
                    unoptimized
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
                <WhatsAppIcon className="me-2 w-5 h-5" />
                WhatsApp
              </Button>

              <Button
                onClick={onTwitter}
                className="py-3 bg-black text-white border-3 border-gray-700 rounded-neo hover:bg-neo-navy"
              >
                <XTwitterIcon className="me-2 w-5 h-5" />
                X / Twitter
              </Button>

              <Button
                onClick={onFacebook}
                className="py-3 bg-brand-facebook text-white border-3 border-neo-black rounded-neo hover:brightness-110"
              >
                <FacebookIcon className="me-2 w-5 h-5" />
                Facebook
              </Button>

              <Button
                onClick={onTelegram}
                className="py-3 bg-brand-telegram text-white border-3 border-neo-black rounded-neo hover:bg-brand-telegram-hover"
              >
                <Send className="me-2 w-5 h-5" />
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
                  {t('wordHunt.results.lessOptions')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('wordHunt.results.moreOptions')}
                </>
              )}
            </button>

            {/* Secondary Share Options */}
            <>
              {showMoreOptions && (
                <div
                  className="overflow-hidden animate-in fade-in-0 duration-300"
                  style={{ maxHeight: showMoreOptions ? '500px' : '0px', transition: 'max-height 300ms' }}
                >
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <Button
                      onClick={onLinkedIn}
                      className="py-3 bg-brand-linkedin text-white border-3 border-neo-black rounded-neo hover:brightness-110"
                    >
                      <LinkedInIcon className="me-2 w-5 h-5" />
                      LinkedIn
                    </Button>

                    <Button
                      onClick={onEmail}
                      className="py-3 bg-gray-600 text-white border-3 border-neo-black rounded-neo hover:bg-neo-navy-elevated"
                    >
                      <Mail className="me-2 w-5 h-5" />
                      {t('share.email')}
                    </Button>

                    <Button
                      onClick={onSMS}
                      className="py-3 bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo hover:brightness-110"
                    >
                      <MessageSquare className="me-2 w-5 h-5" />
                      {t('share.sms')}
                    </Button>

                    <Button
                      onClick={onCopy}
                      className="py-3 bg-neo-navy-elevated dark:bg-slate-600 text-white border-3 border-neo-black rounded-neo shadow-hard hover:bg-neo-navy-light dark:hover:bg-slate-500"
                    >
                      {copied ? (
                        <>
                          <Check className="me-2 w-5 h-5 text-neo-lime" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="me-2 w-5 h-5" />
                          {t('daily.copyLink')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>

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
                      <Loader size="sm" className="me-2" />
                      {t('wordHunt.results.generating')}
                    </>
                  ) : (
                    <>
                      <ImageDown className="me-2 w-5 h-5" />
                      {t('daily.downloadImage')}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Download Streak Card Button */}
            {onDownloadStreakCard && (
              <div className="mt-2">
                <Button
                  onClick={onDownloadStreakCard}
                  disabled={isGeneratingStreakCard}
                  className="w-full py-3 bg-neo-orange text-white border-3 border-neo-black rounded-neo disabled:opacity-50 hover:brightness-110"
                >
                  {isGeneratingStreakCard ? (
                    <>
                      <Loader size="sm" className="me-2" />
                      {t('wordHunt.results.generating')}
                    </>
                  ) : (
                    <>
                      <Flame className="me-2 w-5 h-5" />
                      {t('daily.shareStreakCard') || '🔥 Share Streak Card'}
                    </>
                  )}
                </Button>
              </div>
            )}

            <Button onClick={onClose} variant="ghost" className="w-full mt-4">
              {t('daily.close')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
