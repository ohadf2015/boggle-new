import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import JoinRedirectClient from './JoinRedirectClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'partyJoin', path: '/party/join', locale });
}

export default function JoinPage() {
  return <JoinRedirectClient />;
}
