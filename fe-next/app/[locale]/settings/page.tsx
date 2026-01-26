// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import SettingsPageClient from './PageClient';

export default function SettingsPage() {
  return <SettingsPageClient />;
}
