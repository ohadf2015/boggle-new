// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import JoinWithCodePageClient from './PageClient';

export default function JoinWithCodePage() {
  return <JoinWithCodePageClient />;
}
