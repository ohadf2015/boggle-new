// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import AdminWordsPageClient from './PageClient';

export default function AdminWordsPage() {
  return <AdminWordsPageClient />;
}
