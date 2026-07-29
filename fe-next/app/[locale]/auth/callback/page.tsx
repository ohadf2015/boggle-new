import type { Metadata } from 'next';
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import AuthCallbackPageClient from './PageClient';

export default function AuthCallbackPage() {
  return <AuthCallbackPageClient />;
}
