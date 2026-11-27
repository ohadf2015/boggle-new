import type { Metadata } from 'next';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-flocabulary';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Flocabulary — Free Vocabulary-Game Alternative (2026) | LexiClash',
    description: 'LexiClash vs Flocabulary compared: active word-formation gameplay vs hip-hop vocabulary videos. No subscription, no student signup, live multiplayer, 6 languages. The free Flocabulary alternative for vocabulary practice.',
    keywords: 'lexiclash vs flocabulary, flocabulary alternative, free flocabulary alternative, flocabulary alternative free, flocabulary vs lexiclash, alternatives to flocabulary, vocabulary game alternative, classroom vocabulary game, free vocabulary practice',
    openGraph: {
      title: 'LexiClash vs Flocabulary — The Free Vocabulary Alternative',
      description: 'Active word games beat watching vocabulary videos for recall. No subscription. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Flocabulary comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Flocabulary — Free Alternative',
      description: 'Play vocabulary, don’t just watch it. No signup. 6 languages. Free.',
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
  { q: 'Is LexiClash a free alternative to Flocabulary?', a: 'Yes — LexiClash is free for a whole class of up to 50 with no subscription. Flocabulary is a paid product (individual and school plans, billed annually). LexiClash never gates classroom features behind a paywall.' },
  { q: 'How is LexiClash different from Flocabulary?', a: 'Flocabulary teaches vocabulary through hip-hop videos plus follow-up activities like vocab cards and Lyric Lab — students mostly watch and respond. LexiClash is an active word game: students find and form words on Boggle-style grids, anagrams, and wheels in live rounds. Different cognitive load — production and recall under time pressure rather than reception.' },
  { q: 'Do students need accounts on LexiClash?', a: 'No. Students join a classroom session with a 6-character code shown by the teacher — no email or signup. Flocabulary student access is tied to class rosters and accounts.' },
  { q: 'Is LexiClash good for ESL / English language learners?', a: 'Yes. LexiClash has native dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese, and Russian with difficulty the teacher sets. Flocabulary is English-content-first (its songs and lessons are in English).' },
  { q: 'Can I use my own vocabulary words?', a: 'Yes — LexiClash teachers upload custom word lists from any unit and use them in duels, whole-class games, or practice. Flocabulary centers on its produced song-and-lesson library; custom word lists feed its activities differently.' },
  { q: 'Does LexiClash have multiplayer?', a: 'Yes — real-time, free, whole-class multiplayer for up to 30 students, plus 1v1 vocabulary duels. Flocabulary has interactive activities but is not built around live head-to-head multiplayer.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Whole class free (50)', '✗ Paid subscription'],
  ['No student signup', '✓ 6-character join code', '✗ Roster / account access'],
  ['Core format', 'Active word-formation games', 'Hip-hop videos + activities'],
  ['Student action', 'Produce & form words', 'Watch, then respond'],
  ['Live whole-class multiplayer', '✓ Free, up to 30', '✗ (interactive lessons, not live PvP)'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['Vocabulary / spelling focus', '✓ Word game core', '✓ Vocabulary-first content'],
  ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'English content-first'],
  ['Custom curriculum word lists', '✓', 'Within its activity model'],
  ['Class analytics dashboard', '✓ Free', '✓ (paid)'],
  ['Best for', 'Active recall + review games', 'Vocabulary introduction via video'],
  ['Setup time', 'Under 60 seconds', 'Pick a lesson / assign'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Flocabulary', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: 'Try LexiClash Free' }}>
      <script id="ld-vs-flocabulary-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-flocabulary-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs Flocabulary"
        title="Flocabulary plays the song. LexiClash makes students play the words."
        lead="Flocabulary nailed vocabulary hooks — its hip-hop videos make terms stick, and students enjoy them."
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/education/vocabulary-games-classroom`} variant="secondary">
              Classroom Games
            </LandingButton>
          </>
        }
        art={LANDING_ART.reading('A LexiClash mascot reading a book of words')}
        artTone="yellow"
        more={
          <p>
            But it&apos;s a reception-first model: watch the song, then do the activity. For teachers who want{' '}
            <strong>active recall and review</strong> on a zero budget, LexiClash flips it. Students form and spell real
            words on Boggle-style grids, anagrams, and wheels in live rounds — no subscription, no student signup, six
            languages. Many teachers introduce words with Flocabulary and <em>review</em> them with LexiClash.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/education/esl-word-games`, label: 'ESL Word Games' }]} />
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title="Side-by-side, no spin">
        <CompareTable
          columns={['Feature', 'LexiClash', 'Flocabulary']}
          rows={compareRows.map((row) => [...row])}
          caption="Flocabulary plan details and pricing as of 2026 — check flocabulary.com for current individual and school plans."
        />
      </Section>

      <Section title="When LexiClash beats Flocabulary">
        <TileGrid
          items={[
            { title: 'Free, no subscription', desc: 'Flocabulary is a paid annual plan. LexiClash classroom features are free and full — useful when there is no budget line for another license.' },
            { title: 'Active recall, not reception', desc: 'Watching a song builds recognition. Forming and spelling words under time pressure builds production and retrieval — the harder, stickier skill.' },
            { title: 'No student accounts', desc: 'A 6-character join code means any class plays instantly, including students without emails or rostered logins.' },
            { title: 'Live multiplayer + duels', desc: 'Whole-class real-time games and 1v1 vocabulary duels add competitive energy Flocabulary’s lesson model doesn’t.' },
            { title: '6 native-dictionary languages', desc: 'For ESL/EFL, Hebrew immersion, or Spanish bilingual programs, LexiClash validates real words in EN/HE/ES/SV/JA/RU. Flocabulary content is English-first.' },
            { title: 'Instant setup', desc: 'Pick a list, project the code, go. No lesson to assign, no roster to manage.' },
          ].map((item) => ({ title: item.title, body: item.desc }))}
        />
      </Section>

      <Section title="When Flocabulary still wins">
        <Prose paper>
          <p>
            LexiClash doesn&apos;t teach new vocabulary the way Flocabulary does. If you want to <em>introduce</em> a unit&apos;s words
            with memorable, standards-aligned songs and structured lessons, Flocabulary&apos;s produced content is excellent and
            hard to replicate. LexiClash shines at the next step: turning those words into fast, competitive review that students
            actually play. The two pair naturally — introduce with Flocabulary, review with LexiClash.
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
            { href: `/${locale}/lexiclash-vs-quizlet`, title: 'LexiClash vs Quizlet', body: 'Word games vs flashcards. Free.' },
            { href: `/${locale}/lexiclash-vs-vocabularyspellingcity`, title: 'LexiClash vs SpellingCity', body: 'Multiplayer vs individual drills' },
            { href: `/${locale}/education`, title: 'Education Hub', body: 'All classroom word games' },
          ]}
        />
      </Section>

      <CtaBand
        tone="purple"
        title="Try it before next class"
        body="Take this week's vocabulary list, drop it in, project the join code. Students play the words instead of watching them. No subscription, no signup, no email capture — five minutes to find out if it fits your class."
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>Start a Classroom Game Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
