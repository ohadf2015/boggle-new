import type { Metadata } from 'next';
import PartyPlayClient from './PartyPlayClient';

export const metadata: Metadata = {
  title: 'Play | LexiClash Party',
};

export default function PartyPlayPage() {
  return <PartyPlayClient />;
}
