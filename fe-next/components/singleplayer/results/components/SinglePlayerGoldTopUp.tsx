'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import WatchAdButton from '@/components/daily/WatchAdButton';

interface Props {
  t: (key: string) => string;
  className?: string;
}

const SinglePlayerGoldTopUp: React.FC<Props> = ({ t, className }) => {
  const { language } = useLanguage();
  return <WatchAdButton t={t} language={language} onCoinsEarned={() => {}} className={className} surface="gold_top_up" />;
};

export default SinglePlayerGoldTopUp;
