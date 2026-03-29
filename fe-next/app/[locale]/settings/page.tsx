import type { Metadata } from 'next';
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import SettingsPageClient from './PageClient';

export default function SettingsPage() {
  return <SettingsPageClient />;
}
