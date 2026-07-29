import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import BoardPlayPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; boardCode: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'communityBoard', path: '/community', locale });
}

interface Props {
  params: Promise<{ boardCode: string; locale: string }>;
}

export default async function BoardPlayPage({ params }: Props) {
  const { boardCode } = await params;
  if (!boardCode) notFound();
  return <BoardPlayPageClient boardCode={boardCode} />;
}
