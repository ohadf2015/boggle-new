import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete Account - LexiClash',
  description: 'Delete your LexiClash account and all associated data',
  robots: { index: false, follow: false },
};

import DeleteAccountPageClient from './PageClient';

export default function DeleteAccountPage() {
  return <DeleteAccountPageClient />;
}
