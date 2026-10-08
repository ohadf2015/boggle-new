import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { GimkitProExclusiveModesHonestyStrip } from '@/components/education/GimkitProExclusiveModesHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { locales } from '@/lib/i18n';
import { translateKey } from '@/lib/i18n/serverTranslate';

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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Script
        id="lexiclash-vs-gimkit-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Do not pass locale to TopBackLink — it has no locale prop (#1136 type pitfall). */}
      <TopBackLink className="mb-4" />

      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">{K('eyebrow', locale)}</p>
        <h1 className="mb-3 font-neo-display text-3xl font-bold sm:text-4xl">{K('h1', locale)}</h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          {K('introBefore', locale)}{' '}
          <strong>{K('introBold', locale)}</strong>{' '}
          {K('introAfter', locale)}
        </p>
        <p className="mt-2 text-sm text-neo-gray-300">
          {K('evidence', locale)}{' '}
          <a
            href="https://help.gimkit.com/en/article/player-maximums-18mbcz0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            help.gimkit.com Player maximums
          </a>
          {' · '}
          <a
            href="https://help.gimkit.com/en/article/gimkit-pro-faq-14h6d62/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            Gimkit Pro FAQ
          </a>
        </p>
      </header>

      <TeacherProCompareCheckoutStrip locale={locale} />

      <GimkitProExclusiveModesHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">{K('sideHeading', locale)}</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">{K('colFeature', locale)}</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">{K('colLexi', locale)}</th>
              <th className="border-b-3 border-neo-gray-400 p-3">{K('colGimkit', locale)}</th>
            </tr>
          </thead>
          <tbody>
            {ROW_KEYS.map((row, i) => (
              <tr key={row} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{K(`${row}Feature`, locale)}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{K(`${row}Lexi`, locale)}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{GIMKIT_COLUMN[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">{K('faqHeading', locale)}</h2>
        <dl className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/40 p-4">
              <dt className="font-bold">{f.q}</dt>
              <dd className="mt-2 text-sm text-neo-gray-200">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-neo-gray-300">
        <Link href={`/${locale}/education/classroom-game`} className="text-neo-lime underline">
          {K('footStart', locale)}
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          {K('footKahoot', locale)}
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-wayground`} className="underline">
          {K('footWayground', locale)}
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-blooket`} className="underline">
          {K('footBlooket', locale)}
        </Link>
      </p>
    </main>
  );
}
