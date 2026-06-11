import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { getSpellingBeeContent, type EducationLocale } from './content';
import { EducationHeroBanner } from '@/components/education/EducationHeroBanner';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { ScrollRevealSection } from '@/components/education/ScrollRevealSection';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/spelling-bee-practice';

const OG_IMAGE: Record<string, string> = {
  en: 'education-hero-en.webp',
  he: 'education-hero-he.webp',
  sv: 'education-hero-sv.webp',
  ja: 'education-hero-ja.webp',
  es: 'education-hero-es.webp',
};

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const c = getSpellingBeeContent(locale);
  // EN-only indexing: the page body (hero/drills/training plan/FAQ) is
  // hardcoded English in this file — only the meta is localized. Indexing the
  // non-EN routes would put English-bodied pages under /he|/es|/sv|/ja, a
  // weak-localization/near-duplicate signal. noindex them until the body is
  // localized (the rich-content siblings index all 5 because their bodies are).
  const isEnglish = locale === 'en';
  const ogImage = `${BASE_URL}/images/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;
  const ogLocale = OG_LOCALE[locale] ?? 'en_US';
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'spelling bee practice online, online spelling bee practice, spelling bee training, spelling games online, spelling practice free, scripps spelling bee practice, classroom spelling bee, spelling games for kids, spelling bee online, spelling competition practice',
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 675, alt: c.metaTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.metaTitle,
      description: c.metaDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${PAGE_PATH}`,
        en: `${BASE_URL}/en${PAGE_PATH}`,
        he: `${BASE_URL}/he${PAGE_PATH}`,
        sv: `${BASE_URL}/sv${PAGE_PATH}`,
        ja: `${BASE_URL}/ja${PAGE_PATH}`,
        es: `${BASE_URL}/es${PAGE_PATH}`,
      },
    },
    robots: isEnglish ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  { q: 'How can I practice for a spelling bee online for free?', a: 'LexiClash gives spelling-bee competitors three complementary practice formats: Boggle-style grids (find every valid word from random letters), Word Wheel (form long words from a curated letter set), and Anagram puzzles (rearrange letters into target words). All free, no signup, no app — just open the browser and play. Multiple short sessions per day build pattern recognition and recall under time pressure.' },
  { q: 'How does this help spelling-bee preparation?', a: 'Spelling bees test recall under stress + word-pattern recognition + spelling under audio cue. Word games drill the first two directly. Word Wheel and Boggle force students to scan letter patterns and recognize valid words quickly. Anagrams train letter-rearrangement under pressure — the same mental motion as spelling unfamiliar words letter by letter.' },
  { q: 'Can I practice 1v1 with another spelling-bee competitor?', a: 'Yes. Use Vocabulary Duels mode to pair two students head-to-head on the same letter grid. First to a target score wins. Excellent simulation of competitive pressure for serious spelling-bee competitors training together.' },
  { q: 'Is this suitable for elementary, middle, and high school spelling bees?', a: 'Yes — difficulty is configurable. Younger competitors can play with shorter words and longer timers; older competitors face longer words and tighter time limits. Custom advanced word lists can drill spelling-bee-specific vocabulary (Greek/Latin roots, scientific terms, geographic names).' },
  { q: 'Does LexiClash use Scripps National Spelling Bee word lists?', a: 'LexiClash supports custom word-list upload, so teachers and parents can paste in any list — including Scripps study lists, regional bee word banks, or grade-specific vocabulary from textbooks. Built-in lists cover general English vocabulary for warm-up practice; custom lists handle competition-specific drilling.' },
  { q: 'How often should a spelling-bee competitor practice?', a: 'Research on retrieval practice (Roediger & Karpicke 2006) and spaced repetition (Cepeda et al. 2008) suggests 10-15 minute sessions, 4-5 days per week, distributed over weeks rather than crammed in days. LexiClash sessions are designed to fit that pattern: 5-10 minute multiplayer rounds + 2-3 minute solo drills.' },
  { q: 'Is LexiClash classroom-ready for school spelling bees?', a: 'Yes. Teachers can run whole-class spelling-bee warm-ups (up to 30 students join with a 4-digit code, no student accounts), 1v1 elimination brackets, or assign solo practice. The teacher dashboard shows per-student accuracy and which words tripped the most competitors — useful for targeting review sessions.' },
  { q: 'Is it free for individual students preparing at home?', a: 'Yes — fully free, no premium tier, no per-user fee. Open the browser, pick a mode, start practicing. No account required (though optional account saves your progress and unlocks streak tracking).' },
];

const drillModes = [
  { title: 'Word Hunt (Boggle-style)', desc: 'Find every valid word on a grid in 90-180 seconds. Trains scan-and-recognize under time pressure.', href: '/practice/wordHunt', accent: 'border-neo-lime' },
  { title: 'Word Wheel', desc: 'Form as many words as possible from a letter set; longer words score more. Trains pattern recognition + recall.', href: '/practice/wheelRush', accent: 'border-neo-cyan' },
  { title: 'Classic Boggle', desc: 'Adjacent-letter word search on a 4x4, 5x5, or 6x6 grid. Trains spatial pattern matching.', href: '/practice/classic', accent: 'border-neo-pink' },
  { title: '1v1 Vocabulary Duel', desc: 'Pair two students head-to-head. Direct competitive practice for serious bee competitors.', href: '/education/duels', accent: 'border-neo-purple' },
];

const trainingPlan = [
  { week: 'Week 1', focus: 'Letter pattern recognition', activity: 'Daily 10-min Word Hunt + 5-min Word Wheel; build comfort with scanning grids and forming common letter patterns.' },
  { week: 'Week 2', focus: 'Vocabulary expansion', activity: 'Add custom word lists from grade-level vocabulary or Scripps study lists; drill 5 mins solo + 5 mins paired duel.' },
  { week: 'Week 3', focus: 'Speed under pressure', activity: 'Reduce timer to 60-90 seconds. Run 1v1 duels with peers. Track which words tripped you.' },
  { week: 'Week 4+', focus: 'Targeted weakness drilling', activity: 'Use the per-student accuracy dashboard to identify weak word categories (Greek roots, silent letters, homophones) and build drill lists for each.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/en${PAGE_PATH}#resource`,
    name: 'Spelling Bee Practice Online',
    url: `${BASE_URL}/en${PAGE_PATH}`,
    inLanguage: 'en',
    learningResourceType: 'Game',
    educationalUse: ['Spelling Practice', 'Spelling Bee Preparation', 'Vocabulary Building', 'Pattern Recognition', 'Competition Training'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '7-18',
    isAccessibleForFree: true,
    teaches: 'Spelling, letter pattern recognition, word recall under time pressure, vocabulary',
    audience: { '@type': 'EducationalAudience', educationalRole: ['student', 'parent'] },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/en/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/en/education`,
    },
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/en${PAGE_PATH}#howto`,
    name: 'How to Practice for a Spelling Bee with LexiClash',
    description: 'Four-step routine for spelling-bee preparation using free word games.',
    totalTime: 'PT15M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Warm up with Word Hunt', text: 'Play one 90-second Word Hunt round to warm up letter-scanning reflexes.' },
      { '@type': 'HowToStep', position: 2, name: 'Drill with Word Wheel', text: 'Play one Word Wheel round focused on long-word formation. Aim for at least one 7-letter word.' },
      { '@type': 'HowToStep', position: 3, name: '1v1 duel with a peer', text: 'Pair with another competitor and run a 2-3 minute Vocabulary Duel on a custom word list from your grade-level study guide.' },
      { '@type': 'HowToStep', position: 4, name: 'Review missed words', text: 'After each session, review the missed-word list. Add tough words to your custom drill list for tomorrow.' },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Spelling Bee Practice', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-sb-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-sb-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-sb-howto" type="application/ld+json">{JSON.stringify(howToJsonLd)}</Script>
      <Script id="ld-sb-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* Hero banner with per-locale image */}
        <EducationHeroBanner
          title="Spelling Bee Practice Online. Free."
          subtitle="Free online spelling bee practice through word games. Boggle-style grids, anagram drills, word wheels, and 1v1 spelling duels. No signup, no app — just open the browser and start practicing for Scripps, regional bees, or classroom spelling tests."
        />

        <section className="grid items-center gap-10 lg:grid-cols-12 mt-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ Spelling Bee Prep ★ Free Forever ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              Spelling Bee <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">Practice</span>
              <br /><span className="text-neo-pink">Online.</span> <span className="text-neo-cyan">Free.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              Word games designed for spelling-bee competitors. Boggle grids, anagram drills, word wheels, 1v1 duels —
              free practice that builds pattern recognition, recall under pressure, and vocabulary depth. No signup,
              no app, browser-based.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/practice/wordHunt`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ Start Word Hunt Drill</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">Free · 90 seconds</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚔ 1v1 Duel</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">Pair with a competitor</span>
              </Link>
            </div>
          </div>
        </section>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Four <span className="text-neo-lime">drill modes</span>.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {drillModes.map((m) => (
              <Link key={m.href} href={`/${locale}${m.href}`} className={`group relative rounded-neo border-3 ${m.accent} bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg`}>
                <h3 className="font-neo-display text-lg font-black uppercase">{m.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{m.desc}</p>
                <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-yellow">Practice now →</span>
              </Link>
            ))}
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            4-week <span className="text-neo-cyan">training plan</span>.
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-neo-gray-200">A structured prep routine for serious spelling-bee competitors. 10-15 minute daily sessions, distributed over 4 weeks.</p>
          <div className="space-y-3">
            {trainingPlan.map((p) => (
              <div key={p.week} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[11px] font-black uppercase tracking-widest text-neo-navy">{p.week}</span>
                  <h3 className="font-neo-display text-base font-black uppercase">{p.focus}</h3>
                </div>
                <p className="mt-2 text-sm text-neo-gray-200">{p.activity}</p>
              </div>
            ))}
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Spelling-bee <span className="text-neo-pink">FAQ</span>.
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard transition-all open:shadow-hard-lg">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                  <span>{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t-3 border-neo-black bg-neo-navy/40 px-5 py-4 text-sm text-neo-gray-200 sm:px-6 sm:text-base">{faq.a}</div>
              </details>
            ))}
          </div>
        </ScrollRevealSection>

        <section className="mt-20 mb-12 rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            10 minutes a day.
            <br /><span className="bg-neo-navy px-3 text-neo-yellow">Better speller by spring.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">No app to install, no subscription, no email signup. Pick a mode, start drilling.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/practice/wordHunt`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ Start Drilling
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              See Education Hub
            </Link>
          </div>
        </section>

        <DistrictUpsellStrip />
      </div>
    </main>
  );
}
