'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Share2, Image as ImageIcon, ImageDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShareImageResult } from '@/utils/shareImageGenerator';

interface ImagePreviewModalProps {
  shareImage: ShareImageResult;
  puzzleNumber: number;
  score: number;
  onClose: () => void;
  onShare: () => void;
  onDownload: () => void;
  t: (key: string) => string;
}

export function ImagePreviewModal({
  shareImage,
  puzzleNumber,
  score,
  onClose,
  onShare,
  onDownload,
  t,
}: ImagePreviewModalProps): React.JSX.Element {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <m.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-neo-navy rounded-xl border-2 border-slate-700 p-5 max-w-lg w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neo-cyan/10 rounded-full border border-neo-cyan/30 mb-2">
            <ImageIcon className="w-4 h-4 text-neo-cyan" />
            <span className="text-xs font-bold text-neo-cyan uppercase tracking-wide">
              {t('daily.shareImage')}
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            {t('daily.shareImageHint')}
          </p>
        </div>

        {/* Image preview */}
        <div className="relative rounded-lg overflow-hidden border border-slate-600 mb-4 bg-neo-navy-light">
          <div className="absolute inset-0 bg-linear-to-br from-neo-cyan/5 via-transparent to-neo-pink/5 pointer-events-none" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shareImage.dataUrl}
            alt={`LexiClash Daily Challenge #${puzzleNumber} - Score: ${Math.round(score)}`}
            className="w-full h-auto relative"
            style={{ maxHeight: '50vh', objectFit: 'contain' }}
          />
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            onClick={onShare}
            className="w-full py-3.5 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-lg shadow-hard font-bold text-sm hover:shadow-hard-lg hover:-translate-y-0.5 transition-all"
          >
            <Share2 className="me-2 w-4 h-4" />
            {t('daily.shareScore')}
          </Button>

          <Button
            onClick={onDownload}
            className="w-full py-3 bg-neo-navy-elevated hover:bg-slate-600 text-white border border-slate-600 rounded-lg font-medium text-sm transition-all"
          >
            <ImageDown className="me-2 w-4 h-4" />
            {t('daily.download')}
          </Button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          {t('daily.close')}
        </button>
      </m.div>
    </m.div>
  );
}
