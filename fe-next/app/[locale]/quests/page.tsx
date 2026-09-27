import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { Suspense } from 'react';
import QuestsPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = await generatePageMetadata({ seoKey: 'quests', path: '/quests', locale });
  // Auth-gated personalized page — no SEO value, exclude from index.
  return {
    ...meta,
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  };
}

export default function QuestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-neo-navy min-h-screen flex items-center justify-center">
          <div className="animate-pulse bg-neo-navy/50 rounded-neo p-8 w-full max-w-md">
            <div className="h-6 bg-neo-white/10 rounded mb-4 w-1/3" />
            <div className="space-y-3">
              {['a', 'b', 'c'].map((id) => (
                <div key={`skeleton-${id}`} className="h-20 bg-neo-white/5 rounded-neo-lg" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <QuestsPageClient />
    </Suspense>
  );
}
