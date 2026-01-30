// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import MultilingualPageClient from './PageClient';

export const metadata = {
  title: 'The Ultimate Guide to Multilingual Word Learning Through Games | LexiClash Blog',
  description: 'Discover how playing word games in multiple languages accelerates vocabulary acquisition and boosts cognitive skills. Research-backed strategies for Hebrew, English, Swedish, and Japanese learners.',
};

export default function MultilingualPage() {
  return <MultilingualPageClient />;
}
