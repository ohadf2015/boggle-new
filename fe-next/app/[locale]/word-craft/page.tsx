import { Suspense } from 'react';
import WordCraftPageClient from './PageClient';

export const metadata = {
  title: 'WordCraft Beta — LexiClash',
  robots: { index: false, follow: false },
};

export default function WordCraftPage() {
  return (
    <Suspense>
      <WordCraftPageClient />
    </Suspense>
  );
}
