// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import ComboMasterPageClient from './PageClient';

export default function ComboMasterPage() {
  return <ComboMasterPageClient />;
}
