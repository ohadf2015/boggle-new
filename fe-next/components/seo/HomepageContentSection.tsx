import { Plus } from 'lucide-react';
import { FreshClose } from '@/components/landing/fresh/FreshClose';
import { FreshFaqMore } from '@/components/landing/fresh/FreshFaqMore';
import { FreshFaqAll, FreshReadMore } from '@/components/landing/fresh/FreshFaqLinks';
import { FAQ_ANSWER, FAQ_ROW, FAQ_SUMMARY, FAQ_TOGGLE } from '@/components/landing/fresh/FreshFaqRow';
import s from '@/components/landing/fresh/FreshMotion.module.css';
import { cn } from '@/lib/utils';

/**
 * Visible homepage content section (AdSense low-value-content remediation, 2026-06-04).
 *
 * Previously this copy was rendered inside `GamePageSeoContent` as an `sr-only`
 * (visually hidden) block — indexable by crawlers but invisible to the human
 * AdSense reviewer, who lands on the game homepage and sees no readable content.
 *
 * This component renders the SAME localized copy VISIBLY, in the neo-brutalist
 * design system, below the game: an "About / How to play / FAQ" publisher block
 * plus prominent links into the editorial surface (guides, blog, about). It
 * doubles as genuine UX (new players get rules + answers) and as the publisher
 * signal AdSense requires. RTL (Hebrew) flips automatically via logical props.
 *
 * Server component — the FAQ uses native <details>/<summary> so it is fully
 * interactive with zero client JavaScript. See docs/2026-06-04-adsense-approval-plan.md.
 */

interface HomepageContent {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}

interface HomepageContentSectionProps {
  content: HomepageContent;
  locale: string;
}

// Localized labels for the section chrome. The body copy
// (title/description/features/faq) is already localized by the caller; only the
// surrounding labels live here. Mirrors the server-component i18n pattern used
// by app/[locale]/page.tsx (static per-locale maps, no client t()).
const labels: Record<string, {
  about: string;
  features: string;
  faq: string;
}> = {
  en: {
    about: 'About LexiClash',
    features: 'What you can play',
    faq: 'Frequently asked questions',
  },
  he: {
    about: 'אודות LexiClash',
    features: 'מה אפשר לשחק',
    faq: 'שאלות נפוצות',
  },
  sv: {
    about: 'Om LexiClash',
    features: 'Vad du kan spela',
    faq: 'Vanliga frågor',
  },
  ja: {
    about: 'LexiClashについて',
    features: '遊べるモード',
    faq: 'よくある質問',
  },
  es: {
    about: 'Acerca de LexiClash',
    features: 'A qué puedes jugar',
    faq: 'Preguntas frecuentes',
  },
  ru: {
    about: 'О LexiClash',
    features: 'Во что можно играть',
    faq: 'Частые вопросы',
  },
};

const FAQ_VISIBLE = 3;

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <details className={cn('group/faq', FAQ_ROW)}>
      <summary className={FAQ_SUMMARY}>
        <span>{question}</span>
        <span data-faq-toggle aria-hidden="true" className={FAQ_TOGGLE}>
          <Plus
            className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 group-open/faq:rotate-45"
            strokeWidth={3}
          />
        </span>
      </summary>
      <p className={FAQ_ANSWER}>{answer}</p>
    </details>
  );
}

export function HomepageContentSection({ content, locale }: HomepageContentSectionProps) {
  const l = labels[locale] ?? labels.en;
  const shown = content.faq.slice(0, FAQ_VISIBLE);
  const folded = content.faq.slice(FAQ_VISIBLE);

  // Homepage gauntlet, round 6: the FAQ is ONE card, the page's one
  // accordion, in the page's own language. Rounds 2-5 set it as fine print
  // (small heading, a paragraph, outline rows, a differently styled "N more"
  // toggle, a link sentence) and the critic read that as a content dump with
  // "a second FAQ accordion". Now everything sits in one card that rhymes
  // with the hero board (black border, pink hard shadow), the thinking mascot
  // riding its corner: a section-scale headline, the About prose as a
  // two-line lead (AdSense reviewer copy, one element, visible at rest), three
  // question rows plus the fold in one row shell (FreshFaqRow), then the
  // full-FAQ link and the one sentence carrying the editorial links. Every
  // answer stays in the HTML (the FAQPage JSON-LD in page.tsx must match
  // on-page copy). The finale PLAY band is still the last thing rendered,
  // straight above the site footer (fresh.shell.ending.test).
  return (
    <div className="w-full">
      <section
        aria-label={l.about}
        className="mx-auto w-full max-w-3xl px-4 pb-24 pt-24 font-neo-body text-neo-cream sm:px-6 md:pb-40 md:pt-32"
      >
        <section aria-labelledby="home-faq-title">
          <div
            data-faq-card
            className="relative rounded-neo-xl border-3 border-neo-black bg-neo-navy-light p-4 shadow-[7px_7px_0_0_var(--neo-pink)] rtl:shadow-[-7px_7px_0_0_var(--neo-pink)] sm:p-6 md:p-8"
          >
            {/* Decorative, painted as CSS: it paints without scrolling, and a
                background is never fetched while its tree is display:none. */}
            <span
              data-faq-mascot
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute -top-[76px] end-3 h-20 w-20 bg-[url(/mascot/bridge-think-nobg.webp)] bg-contain bg-bottom bg-no-repeat drop-shadow-[3px_3px_0_rgb(0_0_0)] md:-top-[108px] md:end-8 md:h-28 md:w-28',
                s.bob
              )}
            />
            <h2
              id="home-faq-title"
              className="font-neo-display text-3xl font-bold leading-[1.08] text-neo-cream text-balance sm:text-4xl md:text-5xl"
            >
              {l.faq}
            </h2>
            {/* About: the full copy stays in one element (AdSense reviewer prose), clamped to two lines */}
            <p className="mt-3 line-clamp-2 max-w-[56ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg">
              {content.description}
            </p>
            <div className="mt-6 flex flex-col gap-2 md:mt-8">
              {shown.map((item) => (
                <FaqCard key={item.question} {...item} />
              ))}
              {folded.length > 0 && (
                <FreshFaqMore count={folded.length}>
                  {folded.map((item) => (
                    <FaqCard key={item.question} {...item} />
                  ))}
                </FreshFaqMore>
              )}
            </div>
            <div className="mt-4 flex flex-col items-start gap-1 md:mt-6">
              <FreshFaqAll locale={locale} />
              <FreshReadMore locale={locale} />
            </div>
          </div>
        </section>
      </section>

      {/* The mobile-tab-bar reserve ends RETURNING visitors' page (they keep
          the tab bar; the finale is hidden for them). Fresh visitors have no tab
          bar on the homepage (homeTree CSS), so nothing pads their ending: a
          reserve there opened a navy strip, or empty lime, above the footer. */}
      <div data-home-only="returning" aria-hidden="true" className="page-content-safe" />

      <FreshClose locale={locale} />
    </div>
  );
}
