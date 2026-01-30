// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import BenefitsPageClient from './PageClient';

export const metadata = {
  title: '10 Surprising Benefits of Playing Word Games Daily | LexiClash Blog',
  description: 'Discover 10 science-backed benefits of word games that go beyond fun. From sharper memory to reduced dementia risk, learn why experts recommend daily word puzzles for brain health.',
};

export default function BenefitsPage() {
  return <BenefitsPageClient />;
}
