import type { Metadata } from 'next';
import { PageClient } from './PageClient';

export const metadata: Metadata = {
  title: 'Adventure Prototype — LexiClash',
  robots: { index: false, follow: false },
};

export default function AdventurePrototypePage() {
  return <PageClient />;
}
