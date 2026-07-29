'use client';

import nextDynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';

// Dynamic import for code splitting
const ChallengeView = nextDynamic(() => import('@/components/challenge/ChallengeView'), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-neo-navy">
      <PageLoader size="lg" text="Loading challenge..." />
    </div>
  ),
  ssr: false,
});

/**
 * Challenge page route
 * Handles "Beat My Score" challenges where players compete on the same board
 */
export default function ChallengePageClient(): React.JSX.Element {
  const params = useParams();
  const challengeCode = params.code as string;

  return <ChallengeView challengeCode={challengeCode} />;
}
