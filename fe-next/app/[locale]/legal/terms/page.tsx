// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import TermsOfServicePageClient from './PageClient';

export default function TermsOfServicePage() {
  return <TermsOfServicePageClient />;
}
