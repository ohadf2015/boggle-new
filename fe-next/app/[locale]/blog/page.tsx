import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import BlogIndexPageClient from './PageClient';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'blog', path: '/blog', locale });
}

export default function BlogIndexPage() {
  return <BlogIndexPageClient />;
}
