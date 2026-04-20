import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationClassroomGame', path: '/education/classroom-game', locale });
}

export default function ClassroomGamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
          <PageLoader size="lg" />
        </div>
      }
    >
      <PageClient />
    </Suspense>
  );
}
