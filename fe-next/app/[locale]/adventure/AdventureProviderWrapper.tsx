'use client';

import { ProgressionProvider } from '@/contexts/ProgressionContext';
import type { ReactNode } from 'react';

export default function AdventureProviderWrapper({ children }: { children: ReactNode }) {
  return <ProgressionProvider>{children}</ProgressionProvider>;
}

