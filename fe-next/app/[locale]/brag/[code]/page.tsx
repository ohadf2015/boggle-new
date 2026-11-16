import type { Metadata } from 'next';
import { deriveBragOgModel, type BragOgModel } from '@/lib/results/bragOgModel';
import BragPageClient from './PageClient';

const BASE_URL = 'https://www.lexiclash.live';

/**
 * Landing page for a shared brag result.
 *
 * Why this route exists instead of hanging the OG image off the join URL: a brag
 * link used to point at `/{locale}?room=CODE`, i.e. the homepage. Giving the
 * homepage a per-result `og:image` would mean reading `searchParams` in its
 * `generateMetadata`, which forces dynamic rendering on the app's primary SEO
 * and LCP-critical page. So the brag link gets its own URL, and the room join
 * stays one tap away.
 *
 * It must RENDER (not redirect): a crawler unfurling a redirect would read the
 * destination's metadata, and the image would never appear in the chat preview.
 *
 * Not indexed — every URL is one player's single round.
 */
type Props = {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

const IMAGE_KEYS = ['score', 'rival', 'name', 'mode', 'words', 'best', 'kind', 'title', 'me'] as const;

function imageParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const img = new URLSearchParams();
  for (const key of IMAGE_KEYS) {
    const value = first(sp[key]);
    if (value) img.set(key, value);
  }
  return img;
}

function momentCopy(m: BragOgModel): { title: string; description: string } | null {
  const who = m.me ?? 'A player';
  switch (m.kind) {
    case 'record':
      return { title: `New record: ${m.score}`, description: `${who} set a new personal best of ${m.score} on LexiClash. Think you can beat it?` };
    case 'worldRecord':
      return { title: `World record: ${m.score}`, description: `${who} just set a LexiClash world record: ${m.score}. Think you can beat it?` };
    case 'achievement':
      return {
        title: m.title ? `Achievement unlocked: ${m.title}` : 'Achievement unlocked',
        description: `${who} unlocked ${m.title ? `"${m.title}"` : 'an achievement'} on LexiClash. Come play.`,
      };
    case 'level':
      return { title: `Level ${m.score}`, description: `${who} hit level ${m.score} on LexiClash. Come play.` };
    default:
      return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const sp = await searchParams;

  // Forward only the fields the image understands. `deriveBragOgModel` clamps and
  // sanitises every one of them, so nothing here is trusted.
  const img = imageParams(sp);
  const ogImage = `${BASE_URL}/api/og/brag?${img.toString()}`;

  const score = first(sp.score) || '0';
  const rival = first(sp.rival);
  const scoreline = rival ? `${score} - ${rival}` : score;
  const moment = momentCopy(deriveBragOgModel(img));
  const title = `${moment?.title ?? scoreline} | LexiClash`;
  const description = moment
    ? moment.description
    : rival
      ? `A LexiClash word battle finished ${scoreline}. Tap to take the rematch.`
      : `${score} points in a LexiClash round. Think you can beat it?`;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: 'website',
      url: `${BASE_URL}/${locale}/brag/${code}`,
      title,
      description,
      siteName: 'LexiClash',
      images: [{ url: ogImage, width: 1200, height: 630, alt: moment ? `LexiClash ${moment.title}` : `LexiClash result ${scoreline}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    // One player's single round — never an index target.
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function BragPage({ params, searchParams }: Props) {
  const { locale, code } = await params;
  const sp = await searchParams;
  const img = imageParams(sp);

  return (
    <BragPageClient
      locale={locale}
      code={code}
      imageQuery={img.toString()}
      hasRival={!!first(sp.rival)}
      kind={deriveBragOgModel(img).kind}
    />
  );
}
