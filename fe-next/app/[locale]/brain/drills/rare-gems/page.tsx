// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import RareGemsPageClient from './PageClient';

export default function RareGemsPage() {
  return <RareGemsPageClient />;
}
