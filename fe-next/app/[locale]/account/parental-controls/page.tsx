import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Parental Controls - LexiClash',
  description: 'Manage social features for this account',
  robots: { index: false, follow: false },
};

import ParentalControlsPageClient from './PageClient';

export default function ParentalControlsPage() {
  return <ParentalControlsPageClient />;
}
