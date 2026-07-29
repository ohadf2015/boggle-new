'use client';

import React from 'react';
import WatchAdButton from '@/components/daily/WatchAdButton';

interface Props {
  t: (key: string) => string;
  className?: string;
}

const SinglePlayerGoldTopUp: React.FC<Props> = ({ t, className }) => (
  <WatchAdButton t={t} onCoinsEarned={() => {}} className={className} surface="gold_top_up" />
);

export default SinglePlayerGoldTopUp;
