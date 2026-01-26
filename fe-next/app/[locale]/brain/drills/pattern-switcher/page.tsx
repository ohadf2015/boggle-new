// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import PatternSwitcherPageClient from './PageClient';

export default function PatternSwitcherPage() {
  return <PatternSwitcherPageClient />;
}
