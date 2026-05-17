'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useWordCraftMode } from '@/hooks/useWordCraftModeFlag';

// `ssr: false` is only legal inside a Client Component. Keeping it in
// page.tsx (which exports `metadata` and is therefore a Server Component)
// fails Next.js 16 / Turbopack build with:
//   `ssr: false` is not allowed with `next/dynamic` in Server Components.
const WordCraftPageClient = dynamic(() => import('./PageClient'), {
  ssr: false,
});
const GemHuntPageClient = dynamic(
  () => import('@/components/word-craft/gems/GemHuntPageClient'),
  { ssr: false },
);

export function WordCraftClient() {
  const mode = useWordCraftMode();
  return (
    <Suspense>
      {mode === 'gems' ? <GemHuntPageClient /> : <WordCraftPageClient />}
    </Suspense>
  );
}
