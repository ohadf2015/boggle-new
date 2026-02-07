// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import MilogWordsPageClient from './PageClient';

export default function MilogWordsPage() {
  return <MilogWordsPageClient />;
}
