// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import ChallengePageClient from './PageClient';

export default function ChallengePage() {
  return <ChallengePageClient />;
}
