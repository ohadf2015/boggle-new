// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import AdminPageClient from './PageClient';

export default function AdminPage() {
  return <AdminPageClient />;
}
