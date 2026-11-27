import type { Metadata } from 'next';
import {
  CompareTable,
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
import { getBrainLandingCopy } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

const OG_IMAGE: Record<string, string> = {
  en: 'og-image-en.webp',
  he: 'og-image-he.webp?v=2',
  sv: 'og-image-en.webp',
  ja: 'og-image-ja.webp?v=2',
  es: 'og-image-en.webp',
};

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
};

const DRILL_IDS = ['lightning-round', 'memory-hunt', 'combo-master', 'rare-gems'] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getBrainLandingCopy(locale);
  const isSupported = (SUPPORTED_LOCALES as readonly string[]).includes(locale);
  const pageUrl = `${BASE_URL}/${locale}/brain-training-word-games`;
  const ogImage = `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;

  const languageMap: Record<string, string> = { 'x-default': `${BASE_URL}/en/brain-training-word-games` };
  SUPPORTED_LOCALES.forEach((l) => {
    languageMap[l] = `${BASE_URL}/${l}/brain-training-word-games`;
  });

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: copy.metaKeywords,
    openGraph: {
      title: copy.ogTitle,
      description: copy.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: copy.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
      languages: languageMap,
    },
    robots: { index: isSupported, follow: true },
  };
}

const DRILL_TONE = ['bg-neo-lime', 'bg-neo-purple', 'bg-neo-orange', 'bg-neo-cyan'];

export default async function BrainTrainingWordGamesPage({ params }: PageProps) {
  const { locale } = await params;
  const copy = getBrainLandingCopy(locale);

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  });

  const videoGameJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: copy.videoGameName,
    url: `${BASE_URL}/${locale}/brain`,
    description: copy.videoGameDescription,
    image: `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`,
    genre: ['Brain Training', 'Educational', 'Word Game', 'Cognitive Training', 'Puzzle'],
    gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
    playMode: ['SinglePlayer'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (Web Browser)',
    inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}/${locale}/brain` },
    publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  });

  const itemListJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: copy.itemListName,
    description: copy.itemListDescription,
    numberOfItems: copy.drills.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: copy.drills.map((drill, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: drill.name,
      url: `${BASE_URL}/${locale}/brain/drills/${DRILL_IDS[i]}`,
      description: copy.itemListDescriptions[i],
    })),
  });

  const howToJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: copy.howToName,
    description: copy.howToDescription,
    totalTime: 'PT5M',
    step: copy.howToSteps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  });

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/brain`, label: copy.ctaPrimary }}>
      <script id="ld-faq-brain" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-videogame-brain" type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoGameJsonLd }} />
      <script id="ld-itemlist-brain" type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJsonLd }} />
      <script id="ld-howto-brain" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />

      <LandingHero
        eyebrow={copy.badge}
        title={
          <>
            {copy.h1Pre}
            <br />
            <Mark tone="purple">{copy.h1Highlight}</Mark>
          </>
        }
        lead={copy.introP1}
        actions={
          <>
            <LandingButton href={`/${locale}/brain`}>{copy.ctaPrimary}</LandingButton>
            <LandingButton href={`/${locale}/brain/drills/lightning-round`} variant="secondary">
              {copy.ctaSecondary}
            </LandingButton>
          </>
        }
        art={LANDING_ART.brain('')}
        more={
          <>
            <p>{copy.introP2}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-neo-white/60">{copy.marqueeBadges.join(' · ')}</p>
          </>
        }
      />

      <Section title={copy.drillsHeading} intro={copy.drillsSub}>
        <div className="grid items-start gap-5 md:grid-cols-2">
          {copy.drills.map((drill, i) => (
            <article key={drill.name} className="flex flex-col overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl">
              <div className={`flex flex-col gap-0.5 border-b-3 border-neo-black px-5 py-4 ${DRILL_TONE[i % DRILL_TONE.length]}`}>
                <span className="text-xs font-bold uppercase tracking-wide">{drill.domain}</span>
                <h3 className="font-neo-display text-2xl font-bold leading-tight">{drill.name}</h3>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <p className="font-medium italic">{drill.tagline}</p>
                <p className="text-[15px] leading-relaxed">{drill.blurb}</p>
                <div className="rounded-neo border-2 border-neo-black/20 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-neo-black/60">{copy.researchLabel}</p>
                  <p className="text-sm leading-relaxed">{drill.research}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title={copy.comparisonHeading}>
        <CompareTable columns={copy.comparisonHeaders} rows={copy.comparisonRows} caption={copy.comparisonFooter} />
      </Section>

      <Section title={copy.howHeading}>
        <Steps items={copy.steps.map((s) => ({ title: s.title, body: s.sub }))} />
      </Section>

      <Section title={copy.faqHeading}>
        <FaqList items={copy.faqs} />
      </Section>

      <Section title={copy.relatedHeading}>
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/brain`, title: copy.relatedHubTitle, body: copy.relatedHubSub, tone: 'purple' as const },
            { href: `/${locale}/blog/word-games-for-brain-training`, title: copy.relatedScienceTitle, body: copy.relatedScienceSub },
            ...(locale === 'he'
              ? [{ href: '/he/mischaqey-safa-imun-kogniti', title: 'משחקי שפה לאימון קוגניטיבי', body: 'איזה משחק מתרגל איזו יכולת, ותוכנית של 10 דקות ביום' }]
              : []),
            { href: `/${locale}/best-online-word-games`, title: copy.relatedBestTitle, body: copy.relatedBestSub },
            { href: `/${locale}/daily`, title: copy.relatedDailyTitle, body: copy.relatedDailySub },
            { href: `/${locale}/word-of-the-day`, title: copy.relatedWotdTitle, body: copy.relatedWotdSub },
            { href: `/${locale}/multiplayer`, title: copy.relatedMpTitle, body: copy.relatedMpSub },
          ]}
        />
      </Section>

      <CtaBand
        tone="purple"
        title={copy.finalCtaHeading}
        body={copy.finalCtaBody}
        actions={
          <>
            <LandingButton href={`/${locale}/brain`}>{copy.finalCtaPrimary}</LandingButton>
            <LandingButton href={`/${locale}/brain/drills/lightning-round`} variant="secondary">
              {copy.finalCtaSecondary}
            </LandingButton>
          </>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
