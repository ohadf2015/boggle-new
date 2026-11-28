import { buildBlogRss } from '@/lib/blog/feedXml';
import { blogFeedLocales } from '@/lib/blog/posts';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return blogFeedLocales().map((locale) => ({ locale }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const xml = buildBlogRss(locale);
  if (!xml) return new Response('Not found', { status: 404 });
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
