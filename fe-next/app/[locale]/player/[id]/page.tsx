import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  return generatePageMetadata({ seoKey: 'playerProfile', path: `/player/${id}`, locale });
}

import PlayerProfilePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function PlayerProfilePage() {
  return <PlayerProfilePageClient />;
}
