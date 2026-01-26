// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import DailyBuzzAdminPageClient from './PageClient';

export default function DailyBuzzAdminPage() {
  return <DailyBuzzAdminPageClient />;
}
