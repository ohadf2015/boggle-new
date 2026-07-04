import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { getForSchoolsContent, EDUCATION_LOCALES, type EducationLocale } from './content';
import { SchoolLeadForm } from '@/components/education/SchoolLeadForm';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/for-schools';

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
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${PAGE_PATH}`,
        en: `${BASE_URL}/en${PAGE_PATH}`,
        he: `${BASE_URL}/he${PAGE_PATH}`,
        sv: `${BASE_URL}/sv${PAGE_PATH}`,
        ja: `${BASE_URL}/ja${PAGE_PATH}`,
        es: `${BASE_URL}/es${PAGE_PATH}`,
        ru: `${BASE_URL}/ru${PAGE_PATH}`,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getForSchoolsContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#faq`,
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${BASE_URL}/en/education#org`,
    name: 'LexiClash Education',
    url: `${BASE_URL}/en/education`,
    description:
      'Multiplayer vocabulary games for schools — 5 languages including Hebrew RTL, no student logins, 1v1 duels and whole-class play. Free 30-day trial for teachers; school plans from $149/year.',
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    areaServed: ['US', 'IL', 'SE', 'JP', 'ES'],
    offers: [
      { '@type': 'Offer', name: 'Teacher Trial', price: 0, priceCurrency: 'USD', category: 'free trial', description: 'Full 30-day free trial for individual teachers', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'School Plan', price: 149, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 149, priceCurrency: 'USD', unitText: 'year' }, category: 'paid', description: 'School plan: admin dashboard, analytics, curriculum libraries, ad-free environment, SSO', availability: 'https://schema.org/InStock' },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'For Schools', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <JsonLd data={faqJsonLd} />
      <JsonLd data={orgJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              {c.heroTag}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
              {c.heroH1}{' '}
              <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">{c.heroHighlight}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">{c.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${locale}/education/classroom-game`} data-ph-capture-attribute-cta="hero_free_game" className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                {c.heroCta1}
              </Link>
              <a href="#lead" data-ph-capture-attribute-cta="hero_tell_us" className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">
                {c.heroCta2}
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-xl">
              <h2 className="font-neo-display text-xl font-black text-neo-lime">{c.freeForeverTitle}</h2>
              <p className="mt-3 text-neo-gray-200">{c.freeForeverBody}</p>
            </div>
          </div>
        </section>

        {/* Why schools choose us */}
        <section className="mt-16">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.whyTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {c.why.map((w) => (
              <div key={w.title} className="rounded-neo border-neo-thick bg-neo-navy-light p-5 shadow-hard">
                <h3 className="font-neo-display text-lg font-bold text-neo-cyan">{w.title}</h3>
                <p className="mt-2 text-neo-gray-200">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Honest free-tier comparison */}
        <section className="mt-16">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.compareTitle}</h2>
          <p className="mt-3 max-w-3xl text-neo-gray-200">{c.compareIntro}</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-3 border-neo-black font-neo-display">
                  <th className="p-3">Tool</th>
                  <th className="p-3">Their free tier</th>
                  <th className="p-3 text-neo-lime">LexiClash</th>
                </tr>
              </thead>
              <tbody>
                {c.compareRows.map((r) => (
                  <tr key={r.competitor} className="border-b border-neo-white/15">
                    <td className="p-3 font-bold">{r.competitor}</td>
                    <td className="p-3 text-neo-gray-200">{r.freeTierLimit}</td>
                    <td className="p-3 text-neo-lime">{r.lexiclash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">
            Want the full breakdown?{' '}
            <Link href={`/${locale}/lexiclash-vs-kahoot`} className="text-neo-cyan underline underline-offset-2 hover:text-neo-lime">
              LexiClash vs Kahoot — feature-by-feature comparison →
            </Link>
          </p>
        </section>

        {/* What's coming for schools */}
        <section className="mt-16">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.comingTitle}</h2>
          <p className="mt-3 max-w-3xl text-neo-gray-200">{c.comingIntro}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {c.coming.map((w) => (
              <div key={w.title} className="rounded-neo border-neo bg-neo-navy-light p-5">
                <h3 className="font-neo-display text-lg font-bold text-neo-purple">{w.title}</h3>
                <p className="mt-2 text-neo-gray-200">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Lead capture */}
        <section id="lead" className="mt-16 scroll-mt-20 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.leadTitle}</h2>
            <p className="mt-3 text-neo-gray-200">{c.leadIntro}</p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-xl">
              <SchoolLeadForm />
            </div>
          </div>
        </section>

        {/* FAQ (GEO-citable) */}
        <section className="mt-16">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.faqTitle}</h2>
          <div className="mt-6 space-y-4">
            {c.faqs.map((f) => (
              <details key={f.q} className="rounded-neo border-neo bg-neo-navy-light p-4">
                <summary className="cursor-pointer font-neo-display font-bold text-neo-white">{f.q}</summary>
                <p className="mt-2 text-neo-gray-200">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA — don't dead-end a high-intent reader who scrolled the whole page */}
        <section className="mt-16 text-center">
          <h2 className="font-neo-display text-2xl font-black sm:text-3xl">{c.closingTitle}</h2>
          <a href="#lead" className="mt-6 inline-block rounded-neo border-4 border-neo-black bg-neo-pink px-8 py-4 font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
            {c.closingCta}
          </a>
        </section>
      </div>
    </main>
  );
}
