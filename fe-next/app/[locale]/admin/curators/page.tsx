import { Suspense } from 'react';
import CuratorAdminPageClient from './PageClient';

export const metadata = {
  title: 'Curator management · LexiClash',
  robots: { index: false, follow: false },
};

export default function CuratorAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center bg-neo-navy text-neo-white">
          Loading…
        </div>
      }
    >
      <CuratorAdminPageClient />
    </Suspense>
  );
}
