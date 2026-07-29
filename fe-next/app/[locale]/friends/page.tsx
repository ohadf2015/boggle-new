import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import FriendsPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'friends', path: '/friends', locale });
}

export default function FriendsPage() {
  return <FriendsPageClient />;
}
