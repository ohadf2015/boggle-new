'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useWordCraftMode, gateWordCraftMode } from '@/hooks/useWordCraftModeFlag';
import { useAuth } from '@/contexts/AuthContext';

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
const RunPageClient = dynamic(
  () => import('./RunPageClient').then((m) => m.RunPageClient),
  { ssr: false },
);

export function WordCraftClient() {
  const mode = useWordCraftMode();
  const { isAdmin } = useAuth();
  // Only Territory is public. Cards & Gems remain reachable as admin-only dev
  // previews via ?mode=cards / ?mode=gems; everyone else lands on Territory.
  const effectiveMode = gateWordCraftMode(mode, isAdmin);
  return (
    <Suspense>
      {effectiveMode === 'gems' ? (
        <GemHuntPageClient />
      ) : effectiveMode === 'cards' ? (
        <RunPageClient />
      ) : (
        <WordCraftPageClient />
      )}
    </Suspense>
  );
}
