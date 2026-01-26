// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import PrivacyPolicyPageClient from './PageClient';

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyPageClient />;
}
