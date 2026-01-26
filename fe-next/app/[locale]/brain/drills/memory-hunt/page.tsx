// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import MemoryHuntPageClient from './PageClient';

export default function MemoryHuntPage() {
  return <MemoryHuntPageClient />;
}
