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
  links: { howToPlay: string; guides: string; blog: string; about: string };
}> = {
  en: {
    about: 'About LexiClash',
    features: 'What you can play',
    faq: 'Frequently asked questions',
    learnMore: 'Learn more',
    links: { howToPlay: 'How to play', guides: 'Strategy guides', blog: 'From the blog', about: 'About us' },
  },
  he: {
    about: 'אודות LexiClash',
    features: 'מה אפשר לשחק',
    faq: 'שאלות נפוצות',
    learnMore: 'מידע נוסף',
    links: { howToPlay: 'איך משחקים', guides: 'מדריכי אסטרטגיה', blog: 'מהבלוג', about: 'עלינו' },
  },
  sv: {
    about: 'Om LexiClash',
    features: 'Vad du kan spela',
    faq: 'Vanliga frågor',
    learnMore: 'Läs mer',
    links: { howToPlay: 'Hur man spelar', guides: 'Strategiguider', blog: 'Från bloggen', about: 'Om oss' },
  },
  ja: {
    about: 'LexiClashについて',
    features: '遊べるモード',
    faq: 'よくある質問',
    learnMore: '詳しく見る',
    links: { howToPlay: '遊び方', guides: '攻略ガイド', blog: 'ブログ', about: '私たちについて' },
  },
  es: {
    about: 'Acerca de LexiClash',
    features: 'A qué puedes jugar',
    faq: 'Preguntas frecuentes',
    learnMore: 'Más información',
    links: { howToPlay: 'Cómo jugar', guides: 'Guías de estrategia', blog: 'Del blog', about: 'Sobre nosotros' },
  },
};

export function HomepageContentSection({ content, locale }: HomepageContentSectionProps) {
  const l = labels[locale] ?? labels.en;
  const p = `/${locale}`;

  return (
    <section
      aria-label={l.about}
      className="mx-auto w-full max-w-4xl px-4 py-10 font-neo-body text-neo-white"
    >
      {/* About */}
      <h2 className="mb-3 font-neo-display text-2xl font-black text-neo-lime sm:text-3xl">
        {content.title}
      </h2>
      <p className="mb-8 text-base leading-relaxed text-neo-cream/90">
        {content.description}
      </p>

      {/* Features */}
      <h3 className="mb-3 font-neo-display text-xl font-black text-neo-cyan">
        {l.features}
      </h3>
      <ul className="mb-8 grid gap-2 sm:grid-cols-2">
        {content.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 rounded-neo border-neo border-neo-black bg-neo-navy-light p-3 text-sm shadow-hard-sm"
          >
            <span aria-hidden className="font-black text-neo-lime">›</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* FAQ — native disclosure, no client JS */}
      <h3 className="mb-3 font-neo-display text-xl font-black text-neo-pink">
        {l.faq}
      </h3>
      <div className="mb-8 space-y-2">
        {content.faq.map((item) => (
          <details
            key={item.question}
            className="rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard-sm"
          >
            <summary className="cursor-pointer list-none p-3 font-neo-display font-bold text-neo-white marker:hidden">
              {item.question}
            </summary>
            <p className="px-3 pb-3 text-sm leading-relaxed text-neo-cream/90">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      {/* Editorial internal links — surfaces the publisher content to reviewers + users */}
      <nav aria-label={l.learnMore} className="border-t-neo border-neo-black/40 pt-4">
        <h3 className="mb-3 font-neo-display text-lg font-black text-neo-purple">
          {l.learnMore}
        </h3>
        <ul className="flex flex-wrap gap-2">
          {[
            { href: `${p}/how-to-play`, label: l.links.howToPlay },
            { href: `${p}/guides`, label: l.links.guides },
            { href: `${p}/blog`, label: l.links.blog },
            { href: `${p}/about`, label: l.links.about },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded-neo border-neo border-neo-black bg-neo-lime px-4 py-2 text-sm font-bold text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
