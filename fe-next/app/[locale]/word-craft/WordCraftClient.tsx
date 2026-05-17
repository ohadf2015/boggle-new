'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// `ssr: false` is only legal inside a Client Component. Keeping it in
// page.tsx (which exports `metadata` and is therefore a Server Component)
// fails Next.js 16 / Turbopack build with:
//   `ssr: false` is not allowed with `next/dynamic` in Server Components.
const WordCraftPageClient = dynamic(() => import('./PageClient'), {
  ssr: false,
});

export function WordCraftClient() {
  return (
    <Suspense>
      <WordCraftPageClient />
    </Suspense>
  );
}
