import { Suspense } from 'react';
import CuratorPageClient from './PageClient';

export const metadata = {
  title: 'Language Curator · LexiClash',
  robots: { index: false, follow: false },
};

export default function CuratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center bg-neo-navy text-neo-white">
          Loading…
        </div>
      }
    >
      <CuratorPageClient />
    </Suspense>
  );
}
