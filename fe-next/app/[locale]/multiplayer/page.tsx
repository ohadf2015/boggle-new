// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import MultiplayerPageClient from './PageClient';

export default function MultiplayerPage() {
  return <MultiplayerPageClient />;
}
