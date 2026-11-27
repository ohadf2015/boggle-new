import type { Metadata } from 'next';
import { BlooketGapsSetHonestyStrip } from '@/components/education/BlooketGapsSetHonestyStrip';
import { BlooketFreeTierHonestyStrip } from '@/components/education/BlooketFreeTierHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-blooket';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Blooket — Free Word-Game Alternative for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Blooket compared: pre-built word-formation games vs build-your-own quiz game shows. No student signup, no question-writing, vocabulary-focused, 6 languages. The free Blooket alternative for word and vocabulary review.',
    keywords: 'lexiclash vs blooket, blooket alternative, free blooket alternative, blooket alternative free, blooket vs lexiclash, alternatives to blooket, blooket for vocabulary, classroom word game, word game like blooket, vocabulary review game',
    openGraph: {
      title: 'LexiClash vs Blooket — The Free Word-Game Alternative',
      description: 'Pre-built word games beat building quiz sets from scratch. No student signup. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Blooket comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Blooket — Free Alternative',
      description: 'Word games for the classroom. No signup. No question-writing. Free.',
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
  { q: 'Is LexiClash a free alternative to Blooket?', a: 'Yes — LexiClash runs a whole class of up to 50 students free, on 3 classes. Teacher Pro ($9/mo) adds unlimited classes and printable reports. Blooket has a free plan but gates higher player caps, hosting history, and some game modes behind Blooket Plus (a paid subscription). Running the games themselves is never limited — every game mode is free for the whole class.' },
  { q: 'Do students need accounts to play LexiClash?', a: 'No. Students join with a 6-character code shown by the teacher — no email, no signup. Blooket lets students join a live game with a code too, but creating sets, saving stats, and homework assignments are tied to teacher (and sometimes student) accounts.' },
  { q: 'What is the difference between LexiClash and Blooket?', a: 'Blooket is a build-your-own quiz platform — you write question-and-answer sets, then students play them through arcade-style game modes. LexiClash is a ready-to-play word game: students find words on Boggle-style grids, anagrams, and word wheels. No question-writing required, and it is purpose-built for vocabulary and spelling, not generic trivia.' },
  { q: 'Can I use Blooket for vocabulary practice?', a: 'You can, but you have to author every term-definition question yourself, and the gameplay rewards fast clicking on multiple-choice answers rather than actually producing words. LexiClash drills spelling, recall, and letter patterns directly through word-formation gameplay — closer to the skill you are teaching.' },
  { q: 'Does LexiClash work for ESL and multilingual classrooms?', a: 'Yes. LexiClash has native dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese, and Russian, with difficulty the teacher sets. Blooket content is whatever you type in — it has no built-in multilingual word validation.' },
  { q: 'How fast can I start a game compared to Blooket?', a: 'LexiClash is under 60 seconds: pick a built-in or custom word list, project the join code, students play. Blooket requires you to find or build a question set first, which can take 5–15 minutes per topic unless you reuse the community library.' },
  { q: 'How do Blooket and LexiClash differ after a knowledge-gap report?', a: 'Blooket teachers sort Incorrect% (and Plus Opportunities for Growth), then manually rebuild a 「Gaps Set」 for homework — the documented Workflow 2 on blooketapp.com. LexiClash already deep-links class-level miss gaps into Unplugged / 3-min reteach Live (#1124), so the reteach starts without a new set rebuild.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full classroom features)', '✓ Whole class free (50)', 'Starter free: ≤60 live · homework ≤14d (Plus: 300 / 365d)'],
  ['No student signup', '✓ 6-character join code', '✓ Join code (accounts for full features)'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Trivia quiz + arcade game modes'],
  ['Content setup', 'Built-in or upload word list', 'Write your own question sets'],
  ['Vocabulary / spelling focus', '✓ Purpose-built', 'Generic — depends on your questions'],
  ['Live whole-class multiplayer', '✓ Free, up to 50', 'Starter ≤60 · Plus ≤300'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'No built-in language validation'],
  ['Class analytics dashboard', '✓ Free', 'Reports (some gated on Plus)'],
  ['After-report reteach from misses', '✓ Auto miss-gap → Live deep-link (#1124)', 'Manual 「Gaps Set」 rebuild (Incorrect% / Opportunities for Growth)'],
  ['Best for', 'Word + vocabulary review games', 'Any-subject quiz review shows'],
  ['Setup time', 'Under 60 seconds', '5–15 minutes (build a set)'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Blooket', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: 'Try LexiClash Free' }}>
      <script id="ld-vs-blooket-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-blooket-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs Blooket"
        title="Blooket makes you build the game. LexiClash already is one."
        lead="Blooket turned quiz review into an arcade, and students love the game modes."
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/education/vocabulary-games-classroom`} variant="secondary">
              Classroom Games
            </LandingButton>
          </>
        }
        art={LANDING_ART.duel('Two LexiClash mascots facing off in a word duel')}
        artTone="pink"
        more={
          <p>
            But every Blooket session starts the same way: you write a question set. For teachers running{' '}
            <strong>vocabulary and word review</strong>, that&apos;s a lot of authoring for a game that still rewards
            multiple-choice clicking over actually producing words. LexiClash is the opposite — pre-built word-formation
            gameplay (Boggle grids, anagrams, word wheels), no question-writing, no student signup, six languages. Same
            competitive energy, zero prep.
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
          columns={['Feature', 'LexiClash', 'Blooket']}
          rows={compareRows.map((row) => [...row])}
          caption="Blooket plan features and pricing as of 2026 — check blooket.com for current Blooket Plus tiers."
        />
      </Section>

      <div className="min-w-0">
        <BlooketFreeTierHonestyStrip locale={locale} />
        <BlooketGapsSetHonestyStrip locale={locale} />
      </div>

      <Section title="When LexiClash beats Blooket">
        <TileGrid
          variant="paper"
          items={[
            { title: 'No question sets to write', desc: 'Blooket needs a finished question set before anyone plays. LexiClash uses built-in word lists or a one-minute custom upload — no authoring step at all.' },
            { title: 'Actually practices words', desc: 'Blooket gameplay rewards fast multiple-choice clicking. LexiClash makes students spell and form words under time pressure — the skill you are actually teaching.' },
            { title: 'Purpose-built for vocabulary', desc: 'Blooket is subject-agnostic trivia. LexiClash is a word game with real dictionaries, so every round reinforces spelling, recall, and letter patterns.' },
            { title: '6 native-dictionary languages', desc: 'For ESL/EFL, Hebrew immersion, or Spanish bilingual programs, LexiClash validates real words in EN/HE/ES/SV/JA/RU. Blooket only knows the answers you typed.' },
            { title: 'Whole class free', desc: 'Blooket caps players and gates some modes/reports on Blooket Plus. LexiClash classroom features are free and full, up to 30 students.' },
            { title: 'Faster to live', desc: 'Reuse-a-set still means finding the right Blooket set. LexiClash goes from idea to join code in under a minute.' },
            { title: 'Miss gaps → Live without a 「Gaps Set」', desc: 'Blooket’s Incorrect% / Opportunities for Growth path still asks you to rebuild a 「Gaps Set」 for homework. LexiClash deep-links the same class misses into reteach Live (#1124) — no Question Bank hop.' },
          ].map((item) => ({ title: item.title, body: item.desc }))}
        />
      </Section>

      <Section title="When Blooket still wins">
        <Prose paper>
          <p>
            LexiClash isn&apos;t a Blooket replacement for every subject. If you teach science, history, or math and want
            game-show review across any content you write, Blooket&apos;s mode variety and community set library are excellent.
            LexiClash is laser-focused: vocabulary, spelling, and word-pattern practice for ELA and language classes. Plenty of
            teachers run Blooket for general review and LexiClash for word work.
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
            { href: `/${locale}/lexiclash-vs-vocabularyspellingcity`, title: 'LexiClash vs SpellingCity', body: 'Multiplayer vs individual drills' },
            { href: `/${locale}/education`, title: 'Education Hub', body: 'All classroom word games' },
          ]}
        />
      </Section>

      <CtaBand
        tone="cyan"
        title="Try it before next class"
        body="Pick a word list. Project the join code. Watch 30 students dive in. No set to build, no signup, no credit card. If LexiClash isn't a fit, you've lost five minutes. If it is, you have a zero-prep word-review game for the rest of the year."
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>Start a Classroom Game Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
