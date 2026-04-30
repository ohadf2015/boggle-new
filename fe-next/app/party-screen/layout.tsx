import { Suspense } from 'react';
import PartyScreenLanguageProvider from './PartyScreenLanguageProvider';

export default function PartyScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PartyScreenLanguageProvider>{children}</PartyScreenLanguageProvider>
    </Suspense>
  );
}
