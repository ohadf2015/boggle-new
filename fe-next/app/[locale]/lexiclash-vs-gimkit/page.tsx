import type { Metadata } from 'next';
import { GimkitProExclusiveModesHonestyStrip } from '@/components/education/GimkitProExclusiveModesHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { locales } from '@/lib/i18n';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { CompareTable, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-gimkit';
const K = (key: string, locale: string) => translateKey(`eg6Land.vsGimkit.${key}`, locale);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/en${PAGE_PATH}` };
  for (const l of locales) languages[l] = `${BASE_URL}/${l}${PAGE_PATH}`;

  return {
    title: K('title', locale),
    description: K('description', locale),
    keywords:
      'lexiclash vs gimkit, gimkit basic alternative, gimkit pro exclusive 5 players, free gimkit alternative, whole class vocabulary game, gimkit basic player limit',
    openGraph: {
      title: 'LexiClash vs Gimkit Basic — Pro-Exclusive modes capped at 5',
      description: K('description', locale),
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Gimkit comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Gimkit Basic — 5-player Pro-Exclusive foil',
      description: 'Pro-Exclusive modes: 5 players on Basic. LexiClash: whole-class free vocab.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages,
    },
    robots: { index: true, follow: true },
  };
}

const FAQ_KEYS = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

// Competitor column stays English on every locale: it quotes Gimkit's own help pages.
const GIMKIT_COLUMN = [
  'Basic: Pro Exclusive modes → 5 players',
  'Unlimited on featured modes (Basic)',
  'Join / kit codes',
  'Quiz kits / live game modes',
  'Trivia kits, money modes, Pro Exclusives',
  'Player maximums: limited to 5 players',
] as const;

const ROW_KEYS = ['row1', 'row2', 'row3', 'row4', 'row5', 'row6'] as const;

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqs = FAQ_KEYS.map((k) => ({ q: K(`${k}Q`, locale), a: K(`${k}A`, locale) }));
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <LandingPage locale={locale}>
      <script
        id="lexiclash-vs-gimkit-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <LandingHero
        eyebrow={K('eyebrow', locale)}
        title={K('h1', locale)}
        lead={
          <>
            {K('introBefore', locale)}{' '}
            <strong>{K('introBold', locale)}</strong>{' '}
            {K('introAfter', locale)}
          </>
        }
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>{K('footStart', locale)}</LandingButton>}
        art={LANDING_ART.duel('')}
        artTone="purple"
      >
        <p className="text-sm text-neo-white/70">
          {K('evidence', locale)}{' '}
          <a
            href="https://help.gimkit.com/en/article/player-maximums-18mbcz0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan"
          >
            help.gimkit.com Player maximums
          </a>
          {' · '}
          <a
            href="https://help.gimkit.com/en/article/gimkit-pro-faq-14h6d62/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan"
          >
            Gimkit Pro FAQ
          </a>
        </p>
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
        <GimkitProExclusiveModesHonestyStrip locale={locale} />
      </div>

      <Section title={K('sideHeading', locale)}>
        <CompareTable
          columns={[K('colFeature', locale), K('colLexi', locale), K('colGimkit', locale)]}
          rows={ROW_KEYS.map((row, i) => [K(`${row}Feature`, locale), K(`${row}Lexi`, locale), GIMKIT_COLUMN[i]])}
        />
      </Section>

      <Section title={K('faqHeading', locale)}>
        <FaqList items={faqs} />
      </Section>

      <LinkPills
        items={[
          { href: `/${locale}/education/classroom-game`, label: K('footStart', locale) },
          { href: `/${locale}/lexiclash-vs-kahoot`, label: K('footKahoot', locale) },
          { href: `/${locale}/lexiclash-vs-wayground`, label: K('footWayground', locale) },
          { href: `/${locale}/lexiclash-vs-blooket`, label: K('footBlooket', locale) },
        ]}
      />
    </LandingPage>
  );
}
