// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import LegalIndexPageClient from './PageClient';

export default function LegalIndexPage() {
  return <LegalIndexPageClient />;
}
