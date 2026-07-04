import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { permanentRedirect } from 'next/navigation';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { englishComparisonRedirect } from '@/lib/comparison/enOnlyRedirect';
import { loadTranslation } from '@/translations/loadTranslation';
import { buildComparisonRows, FREERICE_ROW_DEFS } from '@/lib/comparison/comparisonTable';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-freerice';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Freerice — Free Multiplayer Word Game for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Freerice compared: live whole-class multiplayer word games with a teacher dashboard vs solo vocabulary quiz. Both free, no login — LexiClash adds real-time competition, custom word lists, and 5-language word formation.',
    keywords: 'lexiclash vs freerice, freerice alternative, free vocabulary game classroom, freerice for teachers, multiplayer vocabulary game, no login word game, free word game classroom, freerice vs lexiclash, vocabulary game like freerice',
    openGraph: {
      title: 'LexiClash vs Freerice — Free, No-Login Word Games',
      description: 'Both free, both no-login — LexiClash adds live multiplayer, duels, custom lists, and word formation. Free forever.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Freerice comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Freerice — Free Word Games',
      description: 'Live multiplayer vocabulary games. No login. 5 languages. Free.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
        he: `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/juegos-vocabulario-aula`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

const faqs = [
  { q: 'Is LexiClash free and no-login like Freerice?', a: 'Yes — LexiClash is fully free and students join classroom games with a 4-digit code, no signup. Freerice is also free and no-login. The difference is what happens after you join: Freerice is a solo multiple-choice vocabulary quiz, while LexiClash is live word-formation multiplayer with a teacher dashboard.' },
  { q: 'What is the main difference between LexiClash and Freerice?', a: 'Freerice is a solo game — you answer multiple-choice vocabulary questions, and the World Food Programme donates rice for correct answers. LexiClash is a real-time classroom game: students form and spell words on Boggle-style grids and wheels, competing live against the whole class or 1v1. Freerice is great for solo practice with a charitable hook; LexiClash is built for whole-class engagement and teacher visibility.' },
  { q: 'Can teachers track progress on LexiClash?', a: 'Yes — LexiClash has a teacher dashboard showing per-student accuracy, missed words, and class-wide patterns. Freerice is anonymous and solo by design, with no class roster or per-student reporting.' },
  { q: 'Can I use my own vocabulary words?', a: 'Yes — LexiClash teachers upload custom word lists from any unit. Freerice draws from its own fixed question banks; you choose a category, not your own list.' },
  { q: 'Does LexiClash support multiple languages?', a: 'Yes — native dictionaries for English, Hebrew (RTL), Spanish, Swedish, and Japanese with CEFR-scaled difficulty (A1–C2). Freerice also offers several language and subject categories, but as solo quizzes rather than multiplayer word games.' },
  { q: 'Should I use both Freerice and LexiClash?', a: 'They serve different moments. Freerice is a calm, solo, do-good activity — good for early finishers or independent practice. LexiClash is the loud, competitive, whole-class review game. Using both gives you a solo option and a multiplayer option, both free and login-free.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const redirect = englishComparisonRedirect(locale, 'lexiclash-vs-freerice');
  if (redirect) permanentRedirect(redirect);

  const trans = await loadTranslation(locale as any) as Record<string, any>;
  const vs = (trans.vs || trans.comparison || {}) as Record<string, string>;
  const featureLabel = vs.feature || 'Feature';

  const rows = buildComparisonRows(vs, FREERICE_ROW_DEFS);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/${locale}/best-online-word-games` },
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Freerice', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-freerice-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-freerice-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Freerice is solo and quiet. LexiClash is the whole class, live.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Freerice is a lovely idea — answer vocabulary questions, the World Food Programme donates rice, and it&apos;s free with
          no login. But it&apos;s a <strong>solo, multiple-choice</strong> quiz with no teacher view. LexiClash keeps the free,
          no-login part and adds what a classroom needs: live whole-class multiplayer and 1v1 duels, word-formation gameplay
          (spell and build real words, not pick a definition), custom word lists, a teacher dashboard, and five languages.
          Different jobs — keep Freerice for solo do-good practice, run LexiClash for the live review game.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Classroom Games
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Vocabulary Duels
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{vs.sideBySide || 'Side-by-side, no spin'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-lime">{featureLabel}</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Freerice</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([feature, lexi, fr]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{fr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">Freerice is operated by the UN World Food Programme; features as of 2026 — see freerice.com.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats Freerice</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Live multiplayer, not solo', desc: 'Freerice is one student, one screen. LexiClash is the whole class playing the same word list at once, plus 1v1 duels.' },
              { title: 'Teacher visibility', desc: 'Freerice is anonymous. LexiClash shows per-student accuracy, missed words, and which words tripped the whole class.' },
              { title: 'Your own word lists', desc: 'Freerice uses fixed question banks. LexiClash plays this week’s unit vocabulary — upload it in under a minute.' },
              { title: 'Word formation, not multiple choice', desc: 'Freerice asks you to pick a definition. LexiClash makes students spell and build real words — active production, not recognition.' },
              { title: '5 native-dictionary languages', desc: 'EN/HE/ES/SV/JA word validation with CEFR difficulty for ESL and bilingual classes.' },
              { title: 'Still free, still no login', desc: 'You keep everything that makes Freerice easy to start — and add classroom structure on top.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When Freerice still wins</h2>
          <p className="text-neo-gray-200">
            Freerice has something LexiClash doesn&apos;t: every correct answer funds real food aid through the World Food
            Programme. For a calm, independent, feel-good activity — early finishers, a quiet vocabulary warm-up, or a service
            tie-in — Freerice is hard to beat. LexiClash is the opposite energy: loud, fast, whole-class review. Use Freerice
            for solo practice with purpose, and LexiClash when you want the room competing.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More comparisons</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/lexiclash-vs-blooket`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Blooket</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Pre-built word games vs build-a-quiz</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-quizlet`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Quizlet</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs flashcards. Free.</p>
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Education Hub</h3>
              <p className="mt-1 text-xs text-neo-gray-200">All classroom word games</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Try it before next class</h2>
          <p className="mt-4 text-neo-gray-200">
            Keep Freerice for quiet practice. When you want the whole room competing on your vocabulary list, project a
            LexiClash join code and go. Free, no login, no email capture — five minutes to see the difference live makes.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/education/classroom-game`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Start a Classroom Game Free
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
