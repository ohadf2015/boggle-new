// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import StrategiesPageClient from './PageClient';

export const metadata = {
  title: '7 Proven Daily Challenge Strategies to Dominate the Leaderboard | LexiClash Blog',
  description: 'Master the daily challenge with these expert strategies. Learn proven tactics from top players to maximize your score and climb the leaderboard in word games.',
};

export default function StrategiesPage() {
  return <StrategiesPageClient />;
}
