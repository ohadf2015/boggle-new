'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { NeoLoader } from '@/components/ui/NeoLoader';

// Dynamic import for code splitting
const ChallengeView = dynamic(() => import('@/components/challenge/ChallengeView'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-neo-navy">
      <NeoLoader variant="mascot-letters" size="lg" text="Loading challenge..." />
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
