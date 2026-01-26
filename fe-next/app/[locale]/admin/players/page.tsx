// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import PlayersPageClient from './PageClient';

export default function PlayersPage() {
  return <PlayersPageClient />;
}
