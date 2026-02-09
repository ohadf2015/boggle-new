// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import BlastPageClient from './PageClient';

export default function BlastPage() {
  return <BlastPageClient />;
}
