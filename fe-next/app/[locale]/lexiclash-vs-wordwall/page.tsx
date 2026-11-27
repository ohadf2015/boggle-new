import type { Metadata } from 'next';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wordwall';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wordwall — Free Wordwall Alternative for Word Games (2026) | LexiClash',
    description: 'LexiClash vs Wordwall compared: dedicated word-formation gameplay vs templated activities. Whole class free, no Wordwall subscription, no student signup, 6 native dictionaries. The free Wordwall alternative for vocabulary teachers.',
    keywords: 'lexiclash vs wordwall, wordwall alternative, free wordwall alternative, wordwall vs lexiclash, alternatives to wordwall, free wordwall replacement, wordwall for free, classroom word game wordwall, vocabulary tool wordwall, wordwall classroom multiplayer',
    openGraph: {
      title: 'LexiClash vs Wordwall — The Free Alternative',
      description: 'Dedicated word games beat templated activities. No subscription. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordwall comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wordwall — Free Alternative',
      description: 'Word games for the classroom. No subscription. 6 languages.',
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
  { q: 'Is LexiClash a free alternative to Wordwall?', a: 'Yes — LexiClash runs a whole class of up to 50 students free, on 3 classes. Class play stays free. Teacher Pro ($9/mo) is the paid upgrade for teacher tools: class analytics, printable reports, and calm-mode pressure dials. Wordwall has a free tier (limited to 5 active activities, basic templates) and paid plans starting at £4-9/month for unlimited activities and advanced templates.' },
  { q: 'How is LexiClash different from Wordwall?', a: 'Wordwall is a templated activity platform — teachers fill in word lists and get pre-built activities (match-up, anagram, balloon pop, quiz). LexiClash is a dedicated word-formation game — students play actual Boggle-style grids, anagrams, and word wheels with real multiplayer mechanics. Wordwall favors variety of templates; LexiClash favors depth of word-game experience.' },
  { q: 'Do students need accounts on LexiClash?', a: 'No. Students join a classroom session with a 6-character code. Wordwall activities are typically student-account-free too (just a link), but Wordwall gates leaderboards, time limits, and tracking behind teacher accounts and paid tiers.' },
  { q: 'Can teachers upload their own word lists?', a: 'Yes on both. LexiClash word lists upload as plain CSV or paste-in. Wordwall has a similar workflow but requires you to pick a template + redo for each new activity type.' },
  { q: 'Which is better for ESL or language classes?', a: 'LexiClash has built-in dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese and Russian — vocabulary games run natively in each language. Wordwall supports any language for activity text but doesn’t have native word-game mechanics tied to language dictionaries.' },
  { q: 'Does LexiClash have whole-class multiplayer?', a: 'Yes — real-time, up to 30 students per session, all free. Wordwall’s "Race The Clock" and similar live modes are mostly Wordwall Pro/Plus features.' },
  { q: 'How long is a typical session?', a: '5-10 minutes for whole-class multiplayer; 2-3 minutes for 1v1 vocabulary duels. Same 5-minute warm-up window Wordwall is used for, but with deeper word-game mechanics.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free class play', '✓ 3 classes × 50 students', '✗ 5 activity limit free'],
  ['Pricing', 'Free play; Teacher Pro $9/mo', 'Pro £4-9/mo, Plus £15/mo'],
  ['No student signup', '✓ 6-character join code', '✓ link-based'],
  ['Game type', 'Dedicated word-formation games', 'Templated activities (match/quiz/spin)'],
  ['Word-game depth (Boggle/Wheel/Anagram)', '✓ Native mechanics', 'Anagram template only'],
  ['Live whole-class multiplayer', '✓ Free', '✓ Pro tier'],
  ['1v1 student duels', '✓ Built-in', '✗'],
  ['6 native-dictionary languages', '✓ EN/HE/SV/JA/ES/RU', 'Activity text any language; no dictionaries'],
  ['Custom curriculum word lists', '✓', '✓'],
  ['Class analytics', 'Teacher Pro ($9/mo)', 'Limited free; Pro for full'],
  ['Activity templates variety', '3 word-game modes', '50+ templates (varied formats)'],
  ['Setup time', 'Under 60 seconds', '2-5 minutes per activity'],
];

const wordwallAlternatives = [
  { name: 'Kahoot', href: '/lexiclash-vs-kahoot', desc: 'Live multiple-choice quiz on the board, students answer from their devices. Best for a fast check of what the class remembers.' },
  { name: 'Quizlet', href: '/lexiclash-vs-quizlet', desc: 'Flashcard sets with study and test modes. Best for memorizing definitions one term at a time.' },
  { name: 'Blooket', href: '/lexiclash-vs-blooket', desc: 'Your quiz questions played inside arcade-style game modes. Best when you already have a question bank.' },
  { name: 'Gimkit', href: '/lexiclash-vs-gimkit', desc: 'Quiz questions where right answers earn in-game cash for upgrades. Best for longer review sessions.' },
  { name: 'Wayground (formerly Quizizz)', href: '/lexiclash-vs-wayground', desc: 'Quizzes and lessons played live or at each student\'s own pace. Best for homework-style practice.' },
  { name: 'LexiClash', href: '/education/classroom-game', desc: 'Students find words on a letter grid, live against the class or in 1v1 duels. Best for spelling and vocabulary building.' },
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Wordwall', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: 'Try LexiClash Free' }}>
      <script id="ld-vs-wordwall-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-wordwall-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs Wordwall"
        title="Wordwall's template library is huge. LexiClash goes deeper on word games."
        lead="Wordwall is the swiss-army knife of classroom activities — 50+ templates, fill-in-the-blanks, balloon pops, quiz games, the works."
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/education/vocabulary-games-classroom`} variant="secondary">
              Classroom Games
            </LandingButton>
          </>
        }
        art={LANDING_ART.solver('A LexiClash mascot hunting for words with a magnifying glass')}
        artTone="cyan"
        more={
          <p>
            Great breadth. But for vocabulary teachers who specifically want word-formation gameplay (find words on a grid,
            build anagrams, spin word wheels), Wordwall&apos;s anagram template is shallow compared to a purpose-built
            word-game platform. LexiClash trades template variety for depth in the one category teachers reach for most: word
            games. Whole class free, no Wordwall subscription, no student signup, six languages with native dictionaries.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/education/games-for-teachers`, label: 'For Teachers' }]} />
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title="Side-by-side, no spin">
        <CompareTable
          columns={['Feature', 'LexiClash', 'Wordwall']}
          rows={compareRows.map((row) => [...row])}
          caption="Wordwall pricing as of 2026: free tier limited to 5 active activities; Wordwall Pro £4-9/month, Plus £15/month per teacher."
        />
      </Section>

      <Section title="When LexiClash beats Wordwall">
        <TileGrid
          variant="paper"
          items={[
            { title: 'Word-formation depth', desc: 'Wordwall\'s anagram template scrambles letters; that\'s it. LexiClash has Boggle-style grids, multi-letter word wheels with center-letter rules, and proper anagram puzzles — actual word-game mechanics.' },
            { title: 'Real-time multiplayer in free tier', desc: 'Wordwall\'s live multiplayer modes are mostly Pro features. LexiClash classroom multiplayer is free, full-featured, and supports up to 30 students.' },
            { title: '6 native-dictionary languages', desc: 'For ESL, Hebrew immersion, Spanish bilingual — LexiClash has full dictionaries in EN/HE/ES/SV/JA. Wordwall is text-only multilingual, no language-game depth.' },
            { title: '1v1 vocabulary duels', desc: 'Pair students for head-to-head 2-3 minute word battles. Wordwall doesn\'t have a paired-student game format.' },
            { title: 'No 5-activity limit', desc: 'Wordwall\'s free tier caps you at 5 active activities. LexiClash has no activity cap — make as many word lists as you want, at no cost — custom lists are a free-tier feature.' },
            { title: 'Faster setup for word games', desc: 'Wordwall: pick template, paste words, configure. LexiClash: pick a list, share the code. Under 60 seconds vs 2-5 minutes per activity.' },
          ].map((item) => ({ title: item.title, body: item.desc }))}
        />
      </Section>

      <Section title="When Wordwall still wins">
        <Prose paper>
          <p>
            Wordwall&apos;s breadth is unmatched. If you need quiz games, fill-in-the-blanks, image-matching, balloon
            pops, sorting activities, or any of 40+ non-word-game templates, Wordwall is the right tool. LexiClash
            is purpose-built for word-formation games specifically — if that&apos;s your need, the depth wins; if you
            need a Swiss-army knife of activity formats, Wordwall is the better pick. Many teachers use both: Wordwall
            for varied activity formats, LexiClash for vocabulary and word-game review.
          </p>
        </Prose>
      </Section>

      <Section
        title="Other Wordwall alternatives, by what you need"
        intro="Most Wordwall alternatives are quiz platforms: you bring the questions and the tool turns them into an activity, the way Wordwall does with its templates. LexiClash is the odd one out, since students make the words themselves instead of answering questions. Pick by what you want the lesson to do."
      >
        <TileGrid
          columns={2}
          items={wordwallAlternatives.map((alt) => ({ href: `/${locale}${alt.href}`, title: alt.name, body: alt.desc }))}
        />
      </Section>

      <Section title="Frequently asked questions">
        <FaqList items={faqs} />
      </Section>

      <Section title="More comparisons">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/lexiclash-vs-quizlet`, title: 'LexiClash vs Quizlet', body: 'Word games vs flashcards.' },
            { href: `/${locale}/lexiclash-vs-kahoot`, title: 'LexiClash vs Kahoot', body: 'Word games vs quizzes.' },
            { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', body: 'Complete comparison guide' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="Try it before next class"
        body="5-minute slot, vocabulary list ready, code on the projector. If word-game depth matters more than template variety for your classroom, LexiClash is built for that. Class play stays free with no student signup. Teacher Pro ($9/mo) is optional and only unlocks teacher tools: class analytics, printable reports, and calm-mode pressure dials."
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>Start a Classroom Game Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
