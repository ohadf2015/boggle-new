'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Share2, Check } from 'lucide-react';
import { useShareResult } from '@/hooks/useShareResult';
import type { ShareParams } from '@/shared/utils/shareResultGenerator';

interface ShareButtonProps {
  params: ShareParams;
  t: (key: string) => string;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ params, t, className = '' }) => {
  const { copied, handleCopy } = useShareResult(params, t);

  return (
    <m.button
      onClick={handleCopy}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center justify-center gap-2 bg-neo-pink text-white font-black text-sm px-4 py-2.5 uppercase border-3 border-neo-black rounded-neo shadow-hard-sm ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          {t('share.copied')}
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          {t('results.share')}
        </>
      )}
    </m.button>
  );
};

export default ShareButton;
