import type { Metadata } from 'next';
import { Suspense } from 'react';
import ArcadeHub from '@/components/holidays/arcade/ArcadeHub';

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function HolidayArcadePage() {
  return (
    <main className="flex flex-[1_0_auto] flex-col bg-neo-navy">
      <Suspense fallback={<div className="mx-auto mt-6 h-96 w-full max-w-lg animate-pulse rounded-2xl bg-neo-navy-light/60" />}>
        <ArcadeHub />
      </Suspense>
    </main>
  );
}
