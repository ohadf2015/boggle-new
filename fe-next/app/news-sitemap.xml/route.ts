import { buildNewsSitemap } from '@/lib/blog/feedXml';

// Google News reads only the last two days, so the window has to move with the clock.
export const revalidate = 3600;

export function GET() {
  return new Response(buildNewsSitemap(new Date()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
