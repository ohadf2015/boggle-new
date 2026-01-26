// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import AdventurePageClient from './PageClient';

export default function AdventurePage() {
  return <AdventurePageClient />;
}
