import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { shouldRedirectBareSingleplayer } from './redirectLogic';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const path = `/${locale}/singleplayer`;
  return {
    alternates: {
      canonical: `${BASE_URL}${path}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `${BASE_URL}/${l}/singleplayer`])),
    },
  };
}

import SinglePlayerPageClient from './PageClient';

interface SinglePlayerPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Phase 5 soft delete: bare /singleplayer (no recognized params) used to drop
 * visitors directly into a 1v1 vs WordBot. The new UX replaces that with
 * /multiplayer?quickPlay=true. We 308-redirect to preserve SEO link equity from
 * blog posts and SEO landing pages while keeping the route alive for Practice,
 * UGC community boards, daily-replay, and preset auto-launch.
 */
export default async function SinglePlayerPage({ params, searchParams }: SinglePlayerPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);

  if (shouldRedirectBareSingleplayer(query)) {
    permanentRedirect(`/${locale}/multiplayer?quickPlay=true`);
  }

  return <SinglePlayerPageClient />;
}
