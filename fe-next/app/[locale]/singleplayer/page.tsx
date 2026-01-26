// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import SinglePlayerPageClient from './PageClient';

export default function SinglePlayerPage() {
  return <SinglePlayerPageClient />;
}
