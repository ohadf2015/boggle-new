import type { Metadata } from 'next';
import { Suspense } from 'react';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import WordMasteryPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({
    seoKey: 'wordMastery',
    path: '/profile/words',
    locale,
    noIndex: true,
  });
}

export default function WordMasteryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-neo-navy min-h-screen flex items-center justify-center">
          <div className="animate-pulse bg-neo-navy/50 rounded-neo p-8 w-full max-w-md">
            <div className="h-6 bg-neo-white/10 rounded mb-4 w-1/3" />
            <div className="space-y-3">
              {['a', 'b', 'c'].map((id) => (
                <div key={`skeleton-${id}`} className="h-16 bg-neo-white/5 rounded-neo-lg" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <WordMasteryPageClient />
    </Suspense>
  );
}
