import type { Metadata } from 'next';
import Showcase3DClient from './Showcase3DClient';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { FaqJsonLd } from '@/components/showcase3d/FaqJsonLd';
import { loadTranslation } from '@/translations/loadTranslation';

const PATH = '/free-multiplayer-word-game';
const BASE_URL = 'https://www.lexiclash.live';

/**
 * /en/free-multiplayer-word-game is the English member of the localized multiplayer cluster
 * (es/he/sv/ja landing pages each name it as their `en`/`x-default` alternate, and the sitemap
 * declares the same cluster). hreflang only counts when it is reciprocal, so the English page
 * must name those four pages back instead of the generic /<locale>/free-multiplayer-word-game.
 * /ru keeps the same-slug page, the cluster has no Russian landing.
 */
const EN_CLUSTER: { languages: Record<string, string> } = {
      languages: {
        'x-default': `${BASE_URL}/en/free-multiplayer-word-game`,
        en: `${BASE_URL}/en/free-multiplayer-word-game`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        ru: `${BASE_URL}/ru/free-multiplayer-word-game`,
        'en-IL': `${BASE_URL}/en/free-multiplayer-word-game`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/free-multiplayer-word-game`,
        'en-SE': `${BASE_URL}/en/free-multiplayer-word-game`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/free-multiplayer-word-game`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'ru-RU': `${BASE_URL}/ru/free-multiplayer-word-game`,
      },
};


interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  // Indexable, self-canonical, hreflang x5 (title/description from seo.showcase3d).
  const meta = generatePageMetadata({ seoKey: 'showcase3d', path: PATH, locale });
  if (locale !== 'en') return meta;
  return { ...meta, alternates: { ...meta.alternates, languages: EN_CLUSTER.languages } };
}

export default async function FreeMultiplayerWordGamePage({ params }: PageProps) {
  const { locale } = await params;
  const t = (await loadTranslation(locale as Parameters<typeof loadTranslation>[0])) as Record<string, unknown>;
  const s = (t?.showcase3d ?? {}) as Record<string, string>;
  const faq = [1, 2, 3, 4, 5, 6]
    .map((i) => ({ question: s[`faqQ${i}`], answer: s[`faqA${i}`] }))
    .filter((f) => f.question && f.answer);
  return (
    <>
      <VideoGameJsonLd locale={locale} numberOfPlayers={{ minValue: 1, maxValue: 4 }} />
      <FaqJsonLd items={faq} locale={locale} path={PATH} />
      <Showcase3DClient locale={locale} />
    </>
  );
}
