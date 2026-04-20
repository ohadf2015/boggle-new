// This page is outside the [locale] route group and needs its own LanguageProvider.
// It is a server component so metadata can be exported.
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import { LanguageProvider } from '@/contexts/LanguageContext';
import PartyScreenContent from './PartyScreenContent';

export const metadata: Metadata = {
  title: 'Party TV Screen — Display Game on the Big Screen | LexiClash',
  description: 'Cast LexiClash party games to your TV or big screen. Players join from their phones while the game displays here. Perfect for game nights and gatherings.',
};

export default function PartyScreenLanding() {
  return (
    <LanguageProvider initialLanguage="en">
      <PartyScreenContent />
    </LanguageProvider>
  );
}
