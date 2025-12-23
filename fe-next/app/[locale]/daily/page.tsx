'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for code splitting
const DailyChallenge = dynamic(() => import('@/components/daily/DailyChallenge'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-neo-yellow/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-neo-yellow rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Loading Daily Challenge...</p>
      </div>
    </div>
  ),
  ssr: false,
});

// Force dynamic rendering
export const dynamic_config = 'force-dynamic';

/**
 * Daily Challenge page route
 * Same puzzle for everyone worldwide each day
 * Shareable emoji results like Wordle
 */
export default function DailyChallengePage(): React.JSX.Element {
  return <DailyChallenge />;
}
