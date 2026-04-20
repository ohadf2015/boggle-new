import type { Metadata } from 'next';
import { Suspense } from 'react';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationDuels', path: '/education/duels', locale });
}

export default function DuelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
        </div>
      }
    >
      <PageClient />
    </Suspense>
  );
}
