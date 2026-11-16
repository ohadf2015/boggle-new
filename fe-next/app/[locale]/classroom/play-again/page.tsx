import { Suspense } from 'react';
import type { Metadata } from 'next';
import ClassModeBridgeStart from './PageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Handoff only: the student already tapped. This page starts the session and leaves. */
export default function ClassModeBridgeStartPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neo-navy" />}>
      <ClassModeBridgeStart />
    </Suspense>
  );
}
