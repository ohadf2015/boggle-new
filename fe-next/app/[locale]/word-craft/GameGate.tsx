'use client';

import dynamic from 'next/dynamic';
import { useWordCraftCascadeFlag } from '@/hooks/useWordCraftCascadeFlag';

const WordCraftPageClient = dynamic(() => import('./PageClient'), {
  ssr: false,
});
const CascadePageClient = dynamic(
  () => import('./CascadePageClient').then((m) => m.CascadePageClient),
  { ssr: false },
);

/**
 * Top-level gate for /word-craft. Cascade flag wins; otherwise the legacy
 * PageClient handles its own internal run-mode flag check.
 */
export function GameGate() {
  const cascade = useWordCraftCascadeFlag();
  if (cascade) return <CascadePageClient />;
  return <WordCraftPageClient />;
}
