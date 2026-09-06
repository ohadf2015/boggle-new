import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import SinglePlayerPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'singleplayer', path: '/singleplayer', locale });
}

/**
 * Bare /singleplayer is handled client-side as autoStart=bots (see
 * redirectLogic.ts + useSinglePlayerConfig). Do NOT permanentRedirect here —
 * a 308 breaks Next.js soft navigation (RSC payload fail) and was the
 * locale-specific dead end behind /es/singleplayer's post-#897 100% bounce.
 */
export default function SinglePlayerPage() {
  return <SinglePlayerPageClient />;
}
