'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Dynamic import for code splitting
const ChallengeView = dynamic(() => import('@/components/challenge/ChallengeView'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Loading challenge...</p>
      </div>
    </div>
  ),
  ssr: false,
});

// Force dynamic rendering
export const dynamic_config = 'force-dynamic';

/**
 * Challenge page route
 * Handles "Beat My Score" challenges where players compete on the same board
 */
export default function ChallengePage(): React.JSX.Element {
  const params = useParams();
  const challengeCode = params.code as string;

  return <ChallengeView challengeCode={challengeCode} />;
}
