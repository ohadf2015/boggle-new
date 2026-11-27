import type { Metadata } from 'next';
import PlayStoreCTA from '@/components/PlayStoreCTA';
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
import { PLAY_STORE_URL } from '@/utils/androidApp';
import { getDownloadLandingCopy } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const SLUG = 'download-word-game-android';
const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const HERO_IMAGE = '/images/landing/download-word-game-android-hero.webp';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getDownloadLandingCopy(locale);
  const isSupported = (SUPPORTED_LOCALES as readonly string[]).includes(locale);
  const pageUrl = `${BASE_URL}/${locale}/${SLUG}`;
  const ogImage = `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;

  const languageMap: Record<string, string> = { 'x-default': `${BASE_URL}/en/${SLUG}` };
  SUPPORTED_LOCALES.forEach((l) => {
    languageMap[l] = `${BASE_URL}/${l}/${SLUG}`;
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

export default async function DownloadWordGameAndroidPage({ params }: PageProps) {
  const { locale } = await params;
  const copy = getDownloadLandingCopy(locale);

  // SoftwareApplication / MobileApplication — install-intent schema (no rating).
  const appJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': ['MobileApplication', 'SoftwareApplication'],
    name: copy.appName,
    description: copy.appDescription,
    operatingSystem: 'ANDROID',
    applicationCategory: 'GameApplication',
    url: `${BASE_URL}/${locale}/${SLUG}`,
    image: `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`,
    inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
    installUrl: PLAY_STORE_URL,
    downloadUrl: PLAY_STORE_URL,
    isFamilyFriendly: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    publisher: { '@type': 'Organization', '@id': `${BASE_URL}/#organization`, name: 'LexiClash' },
  });

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  });

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: copy.appName, item: `${BASE_URL}/${locale}/${SLUG}` },
    ],
  });

  const howToJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: copy.installHeading,
    description: copy.metaDescription,
    totalTime: 'PT1M',
    step: copy.installSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.sub,
    })),
  });

  return (
    <LandingPage locale={locale}>
      <script id="ld-app-android" type="application/ld+json" dangerouslySetInnerHTML={{ __html: appJsonLd }} />
      <script id="ld-faq-android" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-breadcrumb-android" type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <script id="ld-howto-android" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />

      <LandingHero
        eyebrow={copy.badge}
        title={
          <>
            {copy.h1Pre}
            <br />
            <Mark tone="pink">{copy.h1Highlight}</Mark>
          </>
        }
        lead={copy.introP1}
        actions={
          <>
            <PlayStoreCTA campaign={SLUG} locale={locale} label={copy.installCtaLabel} ariaLabel={copy.installCtaAria} className="min-h-14 shadow-hard-xl" />
            <LandingButton href={`/${locale}`} variant="secondary">
              {copy.playWebLabel}
            </LandingButton>
          </>
        }
        art={{ src: HERO_IMAGE, alt: copy.heroImageAlt, width: 1200, height: 806 }}
        artTone="pink"
        more={
          <>
            <p>{copy.introP2}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-neo-white/60">{copy.marqueeBadges.join(' · ')}</p>
          </>
        }
      />

      <Section title={copy.featuresHeading} intro={copy.featuresSub}>
        <TileGrid columns={copy.features.length === 4 ? 4 : 3} items={copy.features.map((f) => ({ title: f.title, body: f.blurb }))} />
      </Section>

      <Section title={copy.comparisonHeading}>
        <CompareTable highlight={2} columns={copy.comparisonHeaders} rows={copy.comparisonRows} caption={copy.comparisonFooter} />
      </Section>

      <Section title={copy.installHeading}>
        <Steps items={copy.installSteps.map((s) => ({ title: s.title, body: s.sub }))} />
      </Section>

      <Section title={copy.faqHeading}>
        <FaqList items={copy.faqs} />
      </Section>

      <Section title={copy.relatedHeading}>
        <TileGrid
          variant="paper"
          columns={4}
          items={copy.related.map((r) => ({ href: `/${locale}${r.hrefSuffix}`, title: r.title, body: r.sub }))}
        />
      </Section>

      <CtaBand
        tone="lime"
        title={copy.finalCtaHeading}
        body={copy.finalCtaBody}
        actions={
          <>
            <PlayStoreCTA campaign={SLUG} locale={locale} label={copy.installCtaLabel} ariaLabel={copy.installCtaAria} className="min-h-14" />
            <LandingButton href={`/${locale}`} variant="secondary">
              {copy.playWebLabel}
            </LandingButton>
          </>
        }
      />
    </LandingPage>
  );
}
