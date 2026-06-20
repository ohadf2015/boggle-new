import Link from 'next/link';

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

// Localized labels for the section chrome + editorial links. The body copy
// (title/description/features/faq) is already localized by the caller; only the
// surrounding labels live here. Mirrors the server-component i18n pattern used
// by app/[locale]/page.tsx (static per-locale maps, no client t()).
const labels: Record<string, {
  about: string;
  features: string;
  faq: string;
  learnMore: string;
  links: { howToPlay: string; guides: string; blog: string; about: string; daily: string };
}> = {
  en: {
    about: 'About LexiClash',
    features: 'What you can play',
    faq: 'Frequently asked questions',
    learnMore: 'Learn more',
    links: { howToPlay: 'How to play', guides: 'Strategy guides', blog: 'From the blog', about: 'About us', daily: 'Daily challenge' },
  },
  he: {
    about: 'אודות LexiClash',
    features: 'מה אפשר לשחק',
    faq: 'שאלות נפוצות',
    learnMore: 'מידע נוסף',
    links: { howToPlay: 'איך משחקים', guides: 'מדריכי אסטרטגיה', blog: 'מהבלוג', about: 'עלינו', daily: 'המילה היומית' },
  },
  sv: {
    about: 'Om LexiClash',
    features: 'Vad du kan spela',
    faq: 'Vanliga frågor',
    learnMore: 'Läs mer',
    links: { howToPlay: 'Hur man spelar', guides: 'Strategiguider', blog: 'Från bloggen', about: 'Om oss', daily: 'Daglig utmaning' },
  },
  ja: {
    about: 'LexiClashについて',
    features: '遊べるモード',
    faq: 'よくある質問',
    learnMore: '詳しく見る',
    links: { howToPlay: '遊び方', guides: '攻略ガイド', blog: 'ブログ', about: '私たちについて', daily: 'デイリーチャレンジ' },
  },
  es: {
    about: 'Acerca de LexiClash',
    features: 'A qué puedes jugar',
    faq: 'Preguntas frecuentes',
    learnMore: 'Más información',
    links: { howToPlay: 'Cómo jugar', guides: 'Guías de estrategia', blog: 'Del blog', about: 'Sobre nosotros', daily: 'Desafío diario' },
  },
};

export function HomepageContentSection({ content, locale }: HomepageContentSectionProps) {
  const l = labels[locale] ?? labels.en;
  const p = `/${locale}`;

  // Deliberate "reference footer": after the lively sections above, this is the
  // calm, readable deep-dive — the About prose + the single canonical FAQ +
  // links into the editorial surface. Zero client JS (native <details>), which
  // keeps it crawler- and AdSense-reviewer-friendly. "What you can play" now
  // lives in the Mode Showcase above, so the redundant features grid is gone.
  return (
    <section
      aria-label={l.about}
      className="mx-auto mt-4 w-full max-w-4xl px-4 pb-12 pt-10 font-neo-body text-neo-white"
    >
      <div className="rounded-neo border-3 border-neo-black bg-neo-navy-light/60 p-6 shadow-hard sm:p-8">
        {/* About */}
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-neo-lime">
          {l.about}
        </p>
        <h2 className="mb-3 font-neo-display text-2xl font-black text-neo-white sm:text-3xl text-balance">
          {content.title}
        </h2>
        <p className="mb-8 max-w-prose text-sm leading-relaxed text-neo-cream/90 sm:text-base">
          {content.description}
        </p>

        {/* FAQ — native disclosure, no client JS */}
        <h3 className="mb-3 font-neo-display text-lg font-black text-neo-pink sm:text-xl">
          {l.faq}
        </h3>
        <div className="mb-8 space-y-2">
          {content.faq.map((item) => (
            <details
              key={item.question}
              className="group rounded-neo border-2 border-neo-black bg-neo-navy shadow-hard-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-neo-display font-bold text-neo-white marker:hidden sm:p-4">
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="shrink-0 font-black text-neo-pink transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-3 pb-3 text-sm leading-relaxed text-neo-cream/90 sm:px-4 sm:pb-4">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        {/* Editorial internal links — surfaces the publisher content to reviewers + users */}
        <nav aria-label={l.learnMore} className="border-t-2 border-neo-black/40 pt-5">
          <h3 className="mb-3 font-neo-display text-base font-black text-neo-purple">
            {l.learnMore}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {[
              { href: `${p}/daily`, label: l.links.daily },
              { href: `${p}/how-to-play`, label: l.links.howToPlay },
              { href: `${p}/guides`, label: l.links.guides },
              { href: `${p}/blog`, label: l.links.blog },
              { href: `${p}/about`, label: l.links.about },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block rounded-neo border-2 border-neo-black bg-neo-lime px-4 py-2 text-sm font-bold text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
