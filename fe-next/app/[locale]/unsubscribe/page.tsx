// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import UnsubscribePageClient from './PageClient';

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}
