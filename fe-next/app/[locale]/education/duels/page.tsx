export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import PageClient from './PageClient';

export default function DuelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
        </div>
      }
    >
      <PageClient />
    </Suspense>
  );
}
