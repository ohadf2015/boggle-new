import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { englishComparisonRedirect } from '@/lib/comparison/enOnlyRedirect';
import { loadTranslation } from '@/translations/loadTranslation';
import { buildComparisonRows, FREERICE_ROW_DEFS } from '@/lib/comparison/comparisonTable';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
    description: 'LexiClash vs Freerice compared: live whole-class multiplayer word games with a teacher dashboard vs solo vocabulary quiz. Both free, no login — LexiClash adds real-time competition, custom word lists, and 6-language word formation.',
    keywords: 'lexiclash vs freerice, freerice alternative, free vocabulary game classroom, freerice for teachers, multiplayer vocabulary game, no login word game, free word game classroom, freerice vs lexiclash, vocabulary game like freerice',
    openGraph: {
      title: 'LexiClash vs Freerice — Free, No-Login Word Games',
      description: 'Both free, both no-login — LexiClash adds live multiplayer, duels, custom lists, and word formation. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Freerice comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Freerice — Free Word Games',
      description: 'Live multiplayer vocabulary games. No login. 6 languages. Free.',
      images: [`${BASE_URL}/og-image-en.webp`],
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

const faqs = [
  { q: 'Is LexiClash free and no-login like Freerice?', a: 'Yes — LexiClash is free for a whole class of up to 50, and students join classroom games with a 6-character code, no signup. Freerice is also free and no-login. The difference is what happens after you join: Freerice is a solo multiple-choice vocabulary quiz, while LexiClash is live word-formation multiplayer with a teacher dashboard.' },
  { q: 'What is the main difference between LexiClash and Freerice?', a: 'Freerice is a solo game — you answer multiple-choice vocabulary questions, and the World Food Programme donates rice for correct answers. LexiClash is a real-time classroom game: students form and spell words on Boggle-style grids and wheels, competing live against the whole class or 1v1. Freerice is great for solo practice with a charitable hook; LexiClash is built for whole-class engagement and teacher visibility.' },
  { q: 'Can teachers track progress on LexiClash?', a: 'Yes — LexiClash has a teacher dashboard showing per-student accuracy, missed words, and class-wide patterns. Freerice is anonymous and solo by design, with no class roster or per-student reporting.' },
  { q: 'Can I use my own vocabulary words?', a: 'Yes — LexiClash teachers upload custom word lists from any unit. Freerice draws from its own fixed question banks; you choose a category, not your own list.' },
  { q: 'Does LexiClash support multiple languages?', a: 'Yes — native dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese, and Russian with difficulty the teacher sets. Freerice also offers several language and subject categories, but as solo quizzes rather than multiplayer word games.' },
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
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: 'Try LexiClash Free' }}>
      <script id="ld-vs-freerice-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-freerice-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs Freerice"
        title="Freerice is solo and quiet. LexiClash is the whole class, live."
        lead={
          <>
            Freerice is a lovely idea — answer vocabulary questions, the World Food Programme donates rice, and it&apos;s free
            with no login.
          </>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/education/vocabulary-games-classroom`} variant="secondary">
              Classroom Games
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('Two LexiClash mascots high-fiving over a pile of letter tiles')}
        artTone="lime"
        more={
          <p>
            But it&apos;s a <strong>solo, multiple-choice</strong> quiz with no teacher view. LexiClash keeps the free,
            no-login part and adds what a classroom needs: live whole-class multiplayer and 1v1 duels, word-formation gameplay
            (spell and build real words, not pick a definition), custom word lists, a teacher dashboard, and six languages.
            Different jobs — keep Freerice for solo do-good practice, run LexiClash for the live review game.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/education/duels`, label: 'Vocabulary Duels' }]} />
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title={vs.sideBySide || 'Side-by-side, no spin'}>
        <CompareTable
          columns={[featureLabel, 'LexiClash', 'Freerice']}
          rows={rows.map((row) => [...row])}
          caption="Freerice is operated by the UN World Food Programme; features as of 2026 — see freerice.com."
        />
      </Section>

      <Section title="When LexiClash beats Freerice">
        <TileGrid
          columns={2}
          variant="paper"
          items={[
            { title: 'Live multiplayer, not solo', desc: 'Freerice is one student, one screen. LexiClash is the whole class playing the same word list at once, plus 1v1 duels.' },
            { title: 'Teacher visibility', desc: 'Freerice is anonymous. LexiClash shows per-student accuracy, missed words, and which words tripped the whole class.' },
            { title: 'Your own word lists', desc: 'Freerice uses fixed question banks. LexiClash plays this week’s unit vocabulary — upload it in under a minute.' },
            { title: 'Word formation, not multiple choice', desc: 'Freerice asks you to pick a definition. LexiClash makes students spell and build real words — active production, not recognition.' },
            { title: '6 native-dictionary languages', desc: 'EN/HE/ES/SV/JA/RU word validation with difficulty the teacher sets for ESL and bilingual classes.' },
            { title: 'Still free, still no login', desc: 'You keep everything that makes Freerice easy to start — and add classroom structure on top.' },
          ].map((item) => ({ title: item.title, body: item.desc }))}
        />
      </Section>

      <Section title="When Freerice still wins">
        <Prose paper>
          <p>
            Freerice has something LexiClash doesn&apos;t: every correct answer funds real food aid through the World Food
            Programme. For a calm, independent, feel-good activity — early finishers, a quiet vocabulary warm-up, or a service
            tie-in — Freerice is hard to beat. LexiClash is the opposite energy: loud, fast, whole-class review. Use Freerice
            for solo practice with purpose, and LexiClash when you want the room competing.
          </p>
        </Prose>
      </Section>

      <Section title="Frequently asked questions">
        <FaqList items={faqs} />
      </Section>

      <Section title="More comparisons">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/lexiclash-vs-blooket`, title: 'LexiClash vs Blooket', body: 'Pre-built word games vs build-a-quiz' },
            { href: `/${locale}/lexiclash-vs-quizlet`, title: 'LexiClash vs Quizlet', body: 'Word games vs flashcards. Free.' },
            { href: `/${locale}/education`, title: 'Education Hub', body: 'All classroom word games' },
          ]}
        />
      </Section>

      <CtaBand
        tone="yellow"
        title="Try it before next class"
        body="Keep Freerice for quiet practice. When you want the whole room competing on your vocabulary list, project a LexiClash join code and go. Free, no login, no email capture — five minutes to see the difference live makes."
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>Start a Classroom Game Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
