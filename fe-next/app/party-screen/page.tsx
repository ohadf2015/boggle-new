// This page is outside the [locale] route group and needs its own LanguageProvider.
// It is a server component so metadata can be exported.
import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import PartyScreenContent from './PartyScreenContent';

export const metadata: Metadata = {
  title: 'Party | LexiClash',
  description: 'Party screen for LexiClash',
};

export default function PartyScreenLanding() {
  return (
    <LanguageProvider initialLanguage="en">
      <PartyScreenContent />
    </LanguageProvider>
  );
}
