import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'settings', path: '/unsubscribe', locale, noIndex: true });
}

import UnsubscribePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}
