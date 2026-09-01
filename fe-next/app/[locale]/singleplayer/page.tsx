import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { shouldRedirectBareSingleplayer, bareSingleplayerRedirectTarget } from './redirectLogic';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'singleplayer', path: '/singleplayer', locale });
}

import SinglePlayerPageClient from './PageClient';

interface SinglePlayerPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Bare /singleplayer (no recognized params) gets a clear path into play:
 * first-win-fast solo bots game via `autoStart=bots` (see redirectLogic for
 * the /es/singleplayer 100%-bounce evidence). Returning players are re-routed
 * to MP Quick Play client-side. The route stays alive for Practice, UGC
 * community boards, and preset auto-launch.
 */
export default async function SinglePlayerPage({ params, searchParams }: SinglePlayerPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);

  if (shouldRedirectBareSingleplayer(query)) {
    permanentRedirect(bareSingleplayerRedirectTarget(locale));
  }

  return <SinglePlayerPageClient />;
}
