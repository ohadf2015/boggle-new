import type { Metadata } from 'next';
import PartyHostClient from './PartyHostClient';

export const metadata: Metadata = {
  title: 'Host Party Game | LexiClash',
};

export default function PartyHostPage() {
  return <PartyHostClient />;
}
