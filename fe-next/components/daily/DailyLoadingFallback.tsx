'use client';

import React from 'react';
import { DailyArrivalCard } from '@/components/daily/flow/DailyArrivalCard';

interface DailyLoadingFallbackProps {
  mode: 'wordHunt' | 'wordWheel';
}

export function DailyLoadingFallback({ mode }: DailyLoadingFallbackProps): React.JSX.Element {
  return <DailyArrivalCard modeId={mode === 'wordHunt' ? 'word-hunt' : 'word-wheel'} />;
}

export default DailyLoadingFallback;
