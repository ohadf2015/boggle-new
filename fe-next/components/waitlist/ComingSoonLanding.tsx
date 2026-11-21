import { cn } from '@/lib/utils';
import { WaitlistForm, type WaitlistCopy } from './WaitlistForm';
import { LetterBoard } from './LetterBoard';
import { StepCards } from './StepCards';
import { ArabicShapes, type WhyContent } from './ArabicShapes';
import { WaitlistFaq } from './WaitlistFaq';
import { CtaBand } from './CtaBand';
import { typoFor } from './typography';
import styles from './waitlist.module.css';

export interface ComingSoonContent {
  lang: string;
  dir: 'ltr' | 'rtl';
  canonical: string;
  breadcrumbHome: string;
  h1: string;
  intro: string;
  hero: { stamp: string; boardCaption: string; boardAlt: string };
  waitlist: {
    heading: string;
    source: `${string}waitlist${string}`;
    language: string;
    copy: WaitlistCopy;
  };
  steps: { heading: string; items: { title: string; body: string }[] };
  why: WhyContent;
  faqHeading: string;
  faqs: { q: string; a: string }[];
  playNow: { text: string; label: string; href: string; waitlistLabel: string };
  sibling: { label: string; href: string; lang: string };
}

export function comingSoonJsonLd(c: ComingSoonContent) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${c.canonical}#faq`,
      inLanguage: c.lang,
      mainEntity: c.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: c.breadcrumbHome, item: 'https://www.lexiclash.live/en' },
        { '@type': 'ListItem', position: 2, name: c.h1, item: c.canonical },
      ],
    },
  ];
}

export function ComingSoonLanding({ content: c }: { content: ComingSoonContent }) {
  const typo = typoFor(c.dir);
  return (
    <main className={cn('min-h-screen overflow-x-clip bg-neo-navy text-neo-white', typo.body)} lang={c.lang} dir={c.dir}>
      <script type="application/ld+json">{JSON.stringify(comingSoonJsonLd(c))}</script>

      <section className={cn('relative border-b-3 border-neo-black', styles.dots)}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-6 sm:px-6 sm:pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-navy-light px-3 py-1 shadow-hard-pink">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-neo-pink motion-safe:animate-pulse" />
              <span className={cn('text-sm text-neo-pink', typo.display, typo.rtl ? '' : 'text-xs uppercase tracking-widest')}>
                {c.waitlist.heading}
              </span>
            </p>
            <h1 className={cn('mt-4 text-[2rem] text-neo-white sm:text-5xl xl:text-[3.5rem]', typo.display, typo.headLeading)}>{c.h1}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neo-white/90 sm:text-lg">{c.intro}</p>

            <div
              id="waitlist"
              className="mt-6 scroll-mt-24 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light p-4 shadow-hard-xl sm:mt-8 sm:p-6"
            >
              <WaitlistForm
                source={c.waitlist.source}
                language={c.waitlist.language}
                copy={c.waitlist.copy}
                displayClass={typo.display}
                bodyClass={typo.body}
              />
            </div>
          </div>

          <LetterBoard stamp={c.hero.stamp} caption={c.hero.boardCaption} alt={c.hero.boardAlt} typo={typo} />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <StepCards heading={c.steps.heading} items={c.steps.items} typo={typo} />
        <ArabicShapes why={c.why} typo={typo} />
        <div className="max-w-3xl">
          <WaitlistFaq heading={c.faqHeading} faqs={c.faqs} typo={typo} />
        </div>
        <CtaBand playNow={c.playNow} sibling={c.sibling} typo={typo} />
      </div>
    </main>
  );
}
