/**
 * Adventure Layout
 *
 * Wraps all adventure routes with ProgressionProvider for state management.
 * This layout applies to /adventure and all nested routes.
 */

'use client';

import { ProgressionProvider } from '@/contexts/ProgressionContext';

export default function AdventureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProgressionProvider>{children}</ProgressionProvider>;
}
