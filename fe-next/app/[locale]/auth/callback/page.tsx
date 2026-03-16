import type { Metadata } from 'next';

// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import AuthCallbackPageClient from './PageClient';

export default function AuthCallbackPage() {
  return <AuthCallbackPageClient />;
}
