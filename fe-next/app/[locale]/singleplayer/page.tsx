'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for code splitting
const SinglePlayerView = dynamic(() => import('@/components/singleplayer/SinglePlayerView'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Loading single player...</p>
      </div>
    </div>
  ),
  ssr: false,
});

// Force dynamic rendering
export const dynamic_config = 'force-dynamic';

/**
 * Single Player page route
 * Handles all single player game modes: Solo vs Bots, Practice, Challenge
 */
export default function SinglePlayerPage(): React.JSX.Element {
  return <SinglePlayerView />;
}
