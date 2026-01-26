// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import InvalidWordsPageClient from './PageClient';

export default function InvalidWordsPage() {
  return <InvalidWordsPageClient />;
}
