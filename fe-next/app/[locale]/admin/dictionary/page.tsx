// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import DictionaryPageClient from './PageClient';

export default function DictionaryPage() {
  return <DictionaryPageClient />;
}
