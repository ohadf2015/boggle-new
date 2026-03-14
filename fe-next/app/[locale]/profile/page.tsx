// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import ProfilePageClient from './PageClient';

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfilePageClient />
    </Suspense>
  );
}
