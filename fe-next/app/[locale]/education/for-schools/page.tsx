import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { JsonLd } from '@/components/seo/JsonLd';
import { getForSchoolsContent, EDUCATION_LOCALES, type EducationLocale } from './content';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import {
  educationBreadcrumbJsonLd,
  educationFaqJsonLd,
  educationProviderNode,
} from '@/lib/seo/educationLanding';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';
import {
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Section,
  TileGrid,
  landingButtonClass,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';
import { EducationKitRelated } from '@/components/landing/education/EducationKitRelated';
import { ForSchoolsLead } from '@/components/landing/education/ForSchoolsLead';
import { NoAccountCard } from '@/components/landing/education/NoAccountCard';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/for-schools';
const SLUG = 'for-schools';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = EDUCATION_LOCALES.includes(locale as EducationLocale);
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const c = getForSchoolsContent(locale);
  const ogLocale = locale === 'he' ? 'he_IL' : locale === 'es' ? 'es_ES' : locale === 'sv' ? 'sv_SE' : locale === 'ja' ? 'ja_JP' : locale === 'ru' ? 'ru_RU' : 'en_US';
  const ogImage = `${BASE_URL}/og-image-en.webp`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords:
      'vocabulary game for schools, word game for schools, classroom word game district, free word game school license, multiplayer vocabulary game classroom, 1v1 word game classroom, word game no student login, Kahoot alternative vocabulary, Gimkit alternative word game, ESL word game school',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: c.ogTitle }],
    },
    twitter: { card: 'summary_large_image', title: c.ogTitle, description: c.ogDescription, images: [ogImage] },
    // hreflangAlternates, not a hand-written seven: `app/sitemap.ts` emits the ~24-entry
    // map (regional variants included) from the same helper, and Google discards any
    // annotation the other side does not reciprocate.
    alternates: {
      canonical: pageUrl,
      languages: hreflangAlternates(PAGE_PATH),
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getForSchoolsContent(locale);

  const faqJsonLd = educationFaqJsonLd({ locale, path: PAGE_PATH, faqs: c.faqs });

  const orgJsonLd = {
    '@context': 'https://schema.org',
    // Locale-aware @id/url — this node used to name the English org on every build.
    ...educationProviderNode(locale),
    description:
      'Multiplayer vocabulary games for schools — 6 languages including Hebrew RTL, no student logins, 1v1 duels and whole-class play. Free tier for teachers: 3 classes of up to 50 students. Teacher Pro $9/month; Schools & departments from $49 per teacher / year (5+ teachers, invoice/PO).',
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    areaServed: ['US', 'IL', 'SE', 'JP', 'ES'],
    offers: [
      // The free tier is a tier, not a trial: lib/education/freeTierLimits.ts enforces
      // 3 classes of 50 students with no expiry. Advertising a 30-day trial in schema
      // understated the free plan and contradicted every other surface.
      { '@type': 'Offer', name: 'Teacher Free', price: 0, priceCurrency: 'USD', category: 'free', description: 'Free tier for individual teachers, with no expiry: 3 classrooms of up to 50 students, custom word lists, live classroom games', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'Teacher Pro', price: 9, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 9, priceCurrency: 'USD', unitText: 'month' }, category: 'paid', description: 'Unlimited classrooms plus progress analytics, miss-gap homework and reteach tools', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'Schools & departments', price: 49, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 49, priceCurrency: 'USD', unitText: 'year', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'teacher' } }, category: 'paid', description: 'Teacher Pro for every teacher on the team. From $49 per teacher / year for 5+ teachers, paid by invoice or purchase order. Lead capture via Get a school quote — no public checkout.', availability: 'https://schema.org/InStock' },
    ],
  };

  const breadcrumbJsonLd = educationBreadcrumbJsonLd({
    locale,
    path: PAGE_PATH,
    current: educationPageLabel(SLUG, locale),
  });

  const [lead, rest] = splitLead(c.heroSubtitle);
  const play = { href: `/${locale}/education/classroom-game`, label: c.heroCta1 };

  return (
    <LandingPage locale={locale} play={play.label.length <= 18 ? play : undefined}>
      <JsonLd data={faqJsonLd} />
      <JsonLd data={orgJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <LandingHero
        eyebrow={c.heroTag}
        title={
          <>
            {c.heroH1} <Mark>{c.heroHighlight}</Mark>
          </>
        }
        lead={lead}
        actions={
          <>
            <LandingButton href={play.href} data-ph-capture-attribute-cta="hero_free_game">
              {c.heroCta1}
            </LandingButton>
            <a href="#lead" data-ph-capture-attribute-cta="hero_tell_us" className={landingButtonClass('secondary')}>
              {c.heroCta2}
            </a>
          </>
        }
        art={LANDING_ART.trophy('')}
        artTone="cyan"
        more={
          <>
            {rest && <p>{rest}</p>}
            <h2>{c.freeForeverTitle}</h2>
            <p>{c.freeForeverBody}</p>
          </>
        }
      />

      <NoAccountCard locale={locale} />

      <Section title={c.whyTitle}>
        <TileGrid columns={2} items={c.why.map((w) => ({ title: w.title, body: w.body }))} />
      </Section>

      <Section title={c.compareTitle} intro={c.compareIntro}>
        <CompareTable
          columns={[c.compareHeaders.tool, c.compareHeaders.theirFreeTier, 'LexiClash']}
          rows={c.compareRows.map((r) => [r.competitor, r.freeTierLimit, r.lexiclash])}
          highlight={2}
        />
        <p className="text-sm text-neo-white/80">
          {c.compareBreakdownPrompt}{' '}
          <Link href={`/${locale}/lexiclash-vs-kahoot`} className="inline-flex items-center gap-1 font-bold text-neo-cyan underline underline-offset-2">
            <span>{c.compareBreakdownCta}</span>
            <DirectionalIcon icon={ArrowRight} className="inline size-4" />
          </Link>
        </p>
      </Section>

      <Section title={c.comingTitle} intro={c.comingIntro}>
        <TileGrid variant="paper" columns={2} items={c.coming.map((w) => ({ title: w.title, body: w.body }))} />
      </Section>

      <ForSchoolsLead locale={locale} leadTitle={c.leadTitle} leadIntro={c.leadIntro} />

      <Section title={c.faqTitle}>
        <FaqList items={c.faqs} />
      </Section>

      <CtaBand
        tone="pink"
        title={c.closingTitle}
        actions={
          <a href="#lead" className={landingButtonClass('primary')}>
            {c.closingCta}
          </a>
        }
        art={LANDING_ART.trophy('')}
      />

      <EducationKitRelated locale={locale} slug={SLUG} />
    </LandingPage>
  );
}
