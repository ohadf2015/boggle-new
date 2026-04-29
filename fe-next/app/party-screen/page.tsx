// This page sits outside the [locale] route group. Locale is injected via the
// PartyScreenLanguageProvider in layout.tsx (reads ?locale=xx).
import type { Metadata } from 'next';
import PartyScreenContent from './PartyScreenContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Party TV Screen — Display Game on the Big Screen | LexiClash',
  description: 'Cast LexiClash party games to your TV or big screen. Players join from their phones while the game displays here. Perfect for game nights and gatherings.',
};

export default function PartyScreenLanding() {
  return <PartyScreenContent />;
}
