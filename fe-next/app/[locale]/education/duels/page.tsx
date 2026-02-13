// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import DuelsPageClient from './PageClient';

export default function DuelsPage() {
  return <DuelsPageClient />;
}
