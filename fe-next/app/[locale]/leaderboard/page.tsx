// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import LeaderboardPageClient from './PageClient';

export default function LeaderboardPage() {
  return <LeaderboardPageClient />;
}
