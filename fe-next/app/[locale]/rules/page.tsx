// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import RulesPageClient from './PageClient';

export default function RulesPage() {
  return <RulesPageClient />;
}
