import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { JsonLd } from '@/components/seo/JsonLd';
import { GeoFaqList } from '@/components/seo/GeoFaqList';
import { getClassroomContent } from './content';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import { CLASSROOM_WORD_GAMES_BASE, CLASSROOM_WORD_GAMES_PATH, buildClassroomWordGamesJsonLd } from './jsonld';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
  ru: 'ru_RU',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${CLASSROOM_WORD_GAMES_BASE}/en${CLASSROOM_WORD_GAMES_PATH}`;
  const c = getClassroomContent(locale);

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'word games for the classroom, classroom word games, free word games classroom, word games no login, word games no download, online word games classroom, word games for students, free educational games no login, whole class word game',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${CLASSROOM_WORD_GAMES_BASE}/images/education-hero-en.webp`, width: 1200, height: 675, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.twitterTitle,
      description: c.twitterDescription,
      images: [`${CLASSROOM_WORD_GAMES_BASE}/images/education-hero-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getClassroomContent(locale);
  const { webPage, faqPage, breadcrumb } = buildClassroomWordGamesJsonLd(locale, c);

  const moreHrefs = [
    `/${locale}/substitute-teacher-word-games`,
    `/${locale}/bell-ringer-word-games`,
    `/${locale}/education`,
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <JsonLd data={webPage} />
      <JsonLd data={faqPage} />
      <JsonLd data={breadcrumb} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          {c.heroTitle}
        </h1>

        <section
          data-answer
          className="mb-12 rounded-neo border-4 border-neo-cream/40 bg-neo-navy-light p-6 shadow-hard-lg sm:p-8"
        >
          <h2 className="font-neo-display text-xl font-black leading-tight sm:text-2xl">
            {c.geoQuestion}
          </h2>
          <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-neo-white/85 sm:text-lg">
            {c.intro}
          </p>
        </section>

        <TeacherProCompareCheckoutStrip locale={locale} />

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            {c.ctaStart}
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            {c.ctaCduel}
          </Link>
          <Link href={`/${locale}/vocabulary-games-for-middle-school`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            {c.ctaMiddleSchool}
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.fitsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {c.fits.map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.stepsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {c.steps.map((s, i) => (
              <div key={s.t} className="rounded-neo border-3 border-neo-cyan/40 bg-neo-navy/50 p-5 shadow-hard">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-neo border-3 border-neo-black bg-neo-cyan font-bold text-neo-navy">{i + 1}</div>
                <h3 className="mb-1 font-bold text-neo-cyan">{s.t}</h3>
                <p className="text-sm text-neo-gray-200">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <GeoFaqList title={c.faqTitle} items={c.faqs} />

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{c.moreTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {c.moreCards.map((card, i) => (
              <Link key={card.title} href={moreHrefs[i]} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                <h3 className="font-bold text-neo-cyan">{card.title}</h3>
                <p className="mt-1 text-xs text-neo-gray-200">{card.sub}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">{c.finalTitle}</h2>
          <p className="mt-4 text-neo-gray-200">
            {c.finalBody}
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/education/classroom-game`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              {c.finalCta}
            </Link>
          </div>
        </section>
        <TeacherAccessCTA />
      </div>
    </main>
  );
}
