import type { Metadata } from 'next';
import {
  getWordCraftLandingContent,
  buildWordCraftLandingJsonLd,
  WORDCRAFT_LANDING_LOCALES,
  WORDCRAFT_LANDING_PATH,
  WORDCRAFT_GAME_PATH,
  type WordCraftLandingLocale,
} from './content';
import {
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Section,
  Steps,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = WORDCRAFT_LANDING_LOCALES.includes(locale as WordCraftLandingLocale);
  const pageUrl = `${BASE_URL}/${locale}${WORDCRAFT_LANDING_PATH}`;
  const c = getWordCraftLandingContent(locale);
  const ogLocale = locale === 'he' ? 'he_IL' : locale === 'es' ? 'es_ES' : locale === 'sv' ? 'sv_SE' : locale === 'ja' ? 'ja_JP' : 'en_US';
  const ogImage = `${BASE_URL}/og-image-en.webp`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords:
      'word strategy game, free word game online, scrabble alternative, word battle game, play word game vs friend, word duel game, territory word game, beatable word game bot, word game no download, multiplayer word game browser',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: c.ogTitle }],
    },
    twitter: { card: 'summary_large_image', title: c.ogTitle, description: c.ogDescription, images: [ogImage] },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${WORDCRAFT_LANDING_PATH}`,
        en: `${BASE_URL}/en${WORDCRAFT_LANDING_PATH}`,
        he: `${BASE_URL}/he${WORDCRAFT_LANDING_PATH}`,
        sv: `${BASE_URL}/sv${WORDCRAFT_LANDING_PATH}`,
        ja: `${BASE_URL}/ja${WORDCRAFT_LANDING_PATH}`,
        es: `${BASE_URL}/es${WORDCRAFT_LANDING_PATH}`,
      },
    },
    robots: isTargetLocale && locale === 'en' ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getWordCraftLandingContent(locale);
  const playHref = `/${locale}${WORDCRAFT_GAME_PATH}`;
  const jsonLd = buildWordCraftLandingJsonLd(locale, BASE_URL);

  return (
    <LandingPage locale={locale} play={{ href: playHref, label: c.playCta }}>
      <script id="ld-wc-game" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.game) }} />
      <script id="ld-wc-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.faq) }} />
      <script id="ld-wc-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }} />

      <LandingHero
        eyebrow={c.heroTag}
        title={
          <>
            {c.heroH1} <Mark>{c.heroHighlight}</Mark>
          </>
        }
        lead={c.heroSubtitle}
        actions={
          <>
            <LandingButton href={playHref}>{c.playCta}</LandingButton>
            <LandingButton href="#how" variant="secondary">
              {c.secondaryCta}
            </LandingButton>
          </>
        }
        art={{
          src: '/word-craft/landing-hero.webp',
          alt: '',
          width: 1280,
          height: 714,
        }}
        artTone="lime"
      />

      <Section id="how" title={c.stepsTitle}>
        <Steps items={c.steps.map((s) => ({ title: s.title, body: s.body }))} />
      </Section>

      <Section title={c.featuresTitle}>
        <TileGrid variant="paper" items={c.features.map((f) => ({ title: f.title, body: f.body }))} />
      </Section>

      <section className="flex flex-col items-start gap-5 rounded-neo-lg border-3 border-neo-black bg-neo-pink p-6 text-neo-black shadow-hard-xl sm:p-10">
        <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">{c.duelTitle}</h2>
        <p className="max-w-3xl text-lg leading-relaxed">{c.duelBody}</p>
        <LandingButton href={playHref} variant="dark">
          {c.duelCta}
        </LandingButton>
      </section>

      <Section title={c.faqTitle}>
        <FaqList items={c.faqs} />
      </Section>

      <CtaBand
        tone="lime"
        title={c.closingTitle}
        actions={
          <LandingButton href={playHref} variant="dark">
            {c.closingCta}
          </LandingButton>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
