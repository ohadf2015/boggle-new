import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const WordCraftPageClient = dynamic(() => import('./PageClient'), {
  ssr: false,
});

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
