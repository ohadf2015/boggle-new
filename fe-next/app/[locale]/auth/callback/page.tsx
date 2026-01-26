// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import AuthCallbackPageClient from './PageClient';

export default function AuthCallbackPage() {
  return <AuthCallbackPageClient />;
}
