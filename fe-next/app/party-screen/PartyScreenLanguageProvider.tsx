'use client';

import { useSearchParams } from 'next/navigation';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Language } from '@/shared/types/game';

const SUPPORTED: readonly Language[] = ['he', 'en', 'sv', 'ja', 'es', 'fr', 'de'] as const;

function pickLocale(raw: string | null): Language {
  if (!raw) return 'en';
  const lower = raw.toLowerCase().split('-')[0] as Language;
  return SUPPORTED.includes(lower) ? lower : 'en';
}

export default function PartyScreenLanguageProvider({ children }: { children: React.ReactNode }) {
  const search = useSearchParams();
  const locale = pickLocale(search?.get('locale') ?? null);
  return <LanguageProvider initialLanguage={locale}>{children}</LanguageProvider>;
}
