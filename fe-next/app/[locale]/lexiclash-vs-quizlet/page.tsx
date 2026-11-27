import type { Metadata } from 'next';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-quizlet';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Quizlet — Free Quizlet Alternative for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Quizlet compared: free word-formation games vs flashcard-based learning. No student signup, multiplayer for the whole class, 6 languages. The free Quizlet alternative for vocabulary teachers.',
    keywords: 'lexiclash vs quizlet, quizlet alternative, free quizlet alternative, quizlet alternative free, quizlet vs lexiclash, alternatives to quizlet, free flashcard alternative, vocabulary game vs quizlet, classroom vocabulary tool, quizlet for teachers free',
    openGraph: {
      title: 'LexiClash vs Quizlet — The Free Alternative',
      description: 'Word-formation games beat flashcards for spelling + recall. No student signup. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Quizlet comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Quizlet — Free Alternative',
      description: 'Word games for the classroom. No signup. 6 languages. Free.',
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
  { q: 'Is LexiClash a free alternative to Quizlet?', a: 'Yes — LexiClash runs a whole class of up to 50 students free, on 3 classes. Teacher Pro ($9/mo) adds unlimited classes and printable reports. Quizlet has a free tier but locks key features (offline mode, ad-free, custom images, advanced study modes) behind Quizlet Plus ($35.99/year). LexiClash never gates features behind a paywall.' },
  { q: 'Do students need to create accounts on LexiClash?', a: 'No. Students join a classroom session with a 6-character code displayed by the teacher. Quizlet requires an account (or parental consent for under-13 students) and an email address per student.' },
  { q: 'Is LexiClash like Quizlet?', a: 'Different category. Quizlet is flashcard-based — students drill term-definition pairs. LexiClash is a word-formation game — students search for words on Boggle-style grids, anagrams, and word wheels. Better for spelling, recall, and pattern recognition than memorization-focused flashcards.' },
  { q: 'Can teachers use their own word lists?', a: 'Yes on both platforms. LexiClash teachers upload custom vocabulary lists from any unit or curriculum and use them in 1v1 duels, whole-class games, or assigned practice. No import format restrictions.' },
  { q: 'Which is better for ESL or English language learners?', a: 'LexiClash has built-in dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese and Russian — useful for ESL, Hebrew immersion, and bilingual programs. Quizlet supports many languages for user-generated decks but the platform UI is English-first and doesn’t have multilingual classroom multiplayer.' },
  { q: 'Does LexiClash have multiplayer like Quizlet Live?', a: 'Yes — but with key differences. LexiClash multiplayer is real-time, free, and requires zero student accounts (6-character join code). Quizlet Live requires student accounts and is gated behind Quizlet Plus for full features.' },
  { q: 'How do I track student progress?', a: 'LexiClash teacher dashboard shows per-student accuracy, missed words, and class-wide patterns (which words tripped the most students). Quizlet has its own analytics but key views (mastery tracking, individual progress reports) are paid features.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Whole class free (50)', '✗ Quizlet Plus $36/yr'],
  ['No student signup', '✓ 6-character join code', '✗ Account required'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Flashcards + multiple-choice'],
  ['Live whole-class multiplayer', '✓ Free', '✓ Quizlet Plus'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'User-generated decks only'],
  ['Custom curriculum word lists', '✓', '✓'],
  ['Class analytics dashboard', '✓ Free', 'Limited free; paid for full'],
  ['Ads in classroom mode', '✗ None', 'Free tier shows ads'],
  ['Mobile + browser', 'Browser-only (works on any device)', 'iOS/Android apps + web'],
  ['Best for', 'Spelling, recall, pattern recognition', 'Term-definition memorization'],
  ['Setup time', 'Under 60 seconds', '5-10 minutes (deck creation)'],
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Quizlet', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: 'Try LexiClash Free' }}>
      <script id="ld-vs-quizlet-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-quizlet-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs Quizlet"
        title="Quizlet's great. LexiClash is what classrooms use when the budget is zero."
        lead="Quizlet built the modern flashcard standard, and millions of students use it every day."
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/education/vocabulary-games-classroom`} variant="secondary">
              Classroom Games
            </LandingButton>
          </>
        }
        art={LANDING_ART.duel('Two LexiClash mascots facing off in a word duel')}
        artTone="cyan"
        more={
          <p>
            But for teachers running classroom vocabulary review with no budget, no IT permissions, and no time to set up
            student accounts, LexiClash is built differently. Word-formation gameplay (not flashcards), no student signup
            (6-character join code), live whole-class multiplayer in the free tier, and six languages with native
            dictionaries. Same vocabulary goal, opposite philosophy.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/education/duels`, label: 'Vocabulary Duels' }]} />
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title="Side-by-side, no spin">
        <CompareTable
          columns={['Feature', 'LexiClash', 'Quizlet']}
          rows={compareRows.map((row) => [...row])}
          caption="Quizlet pricing as of 2026: free tier with ads + Quizlet Plus $35.99/year for ad-free + offline + advanced features."
        />
      </Section>

      <Section title="When LexiClash beats Quizlet">
        <TileGrid
          variant="paper"
          items={[
            { title: 'No student accounts required', desc: 'A teacher with 30 students who don’t have email addresses (or parental consent for under-13s) can’t use Quizlet without setup friction. LexiClash uses a 6-character join code — students play instantly.' },
            { title: 'Spelling + word-pattern practice', desc: 'Flashcards drill memorization. Word-formation games drill spelling, letter patterns, and recall under time pressure — different cognitive skills, both useful.' },
            { title: 'Free whole-class multiplayer', desc: 'Quizlet Live full features need Quizlet Plus. LexiClash classroom multiplayer is free, full-featured, and supports up to 30 students.' },
            { title: '6 native-dictionary languages', desc: 'For ESL/EFL, Hebrew immersion, or Spanish bilingual programs, LexiClash has full dictionaries in EN/HE/ES/SV/JA. Quizlet relies on user-generated decks for non-English content.' },
            { title: 'No ads in classroom', desc: 'Quizlet free tier shows ads to students during sessions. LexiClash classroom mode is ad-free.' },
            { title: 'Faster setup', desc: 'Quizlet decks take 5-10 minutes to create. LexiClash word lists upload in under a minute, and most teachers use one of the built-in lists for instant play.' },
          ].map((item) => ({ title: item.title, body: item.desc }))}
        />
      </Section>

      <Section title="When Quizlet still wins">
        <Prose paper>
          <p>
            LexiClash isn&apos;t trying to replace Quizlet. If your students need term-definition memorization (foreign language vocabulary
            paired with translations, science terminology, anatomy memorization), Quizlet&apos;s flashcard system is the right tool.
            LexiClash shines for spelling practice, vocabulary recall under time pressure, ESL word-pattern drilling, and
            classroom-wide engagement. Many teachers use both: Quizlet for term-definition, LexiClash for review games.
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
            { href: `/${locale}/lexiclash-vs-kahoot`, title: 'LexiClash vs Kahoot', body: 'Word games vs quiz-only. Free vs Kahoot+.' },
            { href: `/${locale}/lexiclash-vs-wordle`, title: 'LexiClash vs Wordle', body: 'Unlimited play vs 1 puzzle/day' },
            { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', body: 'Complete comparison guide' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="Try it before next class"
        body="Pick a word list. Project the join code. Watch 30 students dive in. If LexiClash isn't a fit for your classroom, you've lost 5 minutes — no signup, no credit card, no email capture. If it is a fit, you have a new tool that costs nothing and takes nothing to set up."
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>Start a Classroom Game Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
