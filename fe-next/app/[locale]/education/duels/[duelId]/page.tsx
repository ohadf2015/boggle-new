import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import PageClient from './PageClient';

export default async function DuelPage({
  params,
}: {
  params: Promise<{ duelId: string }>;
}) {
  const { duelId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
        </div>
      }
    >
      <PageClient duelId={duelId} />
    </Suspense>
  );
}
