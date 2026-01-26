// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import AccessibilitySettingsPageClient from './PageClient';

export default function AccessibilitySettingsPage() {
  return <AccessibilitySettingsPageClient />;
}
