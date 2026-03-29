import type { Metadata } from 'next';
import PartyHubClient from './PartyHubClient';

export const metadata: Metadata = {
  title: 'Party Games | LexiClash',
  description: 'Play party games with friends — Caption Clash, Pixel Clash, Shadow Clash',
};

export default function PartyPage() {
  return <PartyHubClient />;
}
