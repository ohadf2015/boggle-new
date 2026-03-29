import type { Metadata } from 'next';
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import JoinWithCodePageClient from './PageClient';

export default function JoinWithCodePage() {
  return <JoinWithCodePageClient />;
}
