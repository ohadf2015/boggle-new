import Link from 'next/link';

/**
 * Slim, server-rendered editorial nav rendered at the TOP of the homepage.
 *
 * Why it exists: AdSense (and Google's quality systems) judge "is this a content
 * publisher or just a game/tool?" largely from the landing experience. Our editorial
 * surface (guides, blog, about, FAQ) was reachable only from the footer and a section
 * below the game canvas — so a reviewer's first impression was "a game." This strip
 * puts the editorial links near the top of the document (first paint, crawlable HTML,
 * no client JS) so the publisher identity is unmistakable on landing.
 *
 * Server component on purpose: the homepage is server-rendered and LanguageContext is
 * client-only, so we carry a small locale-keyed label map instead of t() — exactly the
 * pattern HomepageContentSection uses. A 'use client' nav would be invisible to the
 * crawler on first paint.
 */

export const HOME_EDITORIAL_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

interface EditorialLabels {
  /** aria-label for the nav landmark */
  nav: string;
  howToPlay: string;
  guides: string;
  blog: string;
  faq: string;
  about: string;
}

const LABELS: Record<string, EditorialLabels> = {
  en: { nav: 'Learn and explore', howToPlay: 'How to Play', guides: 'Guides', blog: 'Blog', faq: 'FAQ', about: 'About' },
  he: { nav: 'ללמוד ולגלות', howToPlay: 'איך משחקים', guides: 'מדריכים', blog: 'בלוג', faq: 'שאלות נפוצות', about: 'אודות' },
  sv: { nav: 'Lär dig och utforska', howToPlay: 'Hur man spelar', guides: 'Guider', blog: 'Blogg', faq: 'Vanliga frågor', about: 'Om oss' },
  ja: { nav: '学んで探索する', howToPlay: '遊び方', guides: 'ガイド', blog: 'ブログ', faq: 'よくある質問', about: '私たちについて' },
  es: { nav: 'Aprende y explora', howToPlay: 'Cómo jugar', guides: 'Guías', blog: 'Blog', faq: 'Preguntas frecuentes', about: 'Acerca de' },
};

interface HomeEditorialNavProps {
  locale: string;
}

export function HomeEditorialNav({ locale }: HomeEditorialNavProps) {
  const l = LABELS[locale] ?? LABELS.en;
  const p = `/${locale}`;
  const links = [
    { href: `${p}/how-to-play`, label: l.howToPlay },
    { href: `${p}/guides`, label: l.guides },
    { href: `${p}/blog`, label: l.blog },
    { href: `${p}/faq`, label: l.faq },
    { href: `${p}/about`, label: l.about },
  ];

  return (
    <nav
      aria-label={l.nav}
      className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-1 gap-y-1 px-4 py-2 font-neo-body sm:justify-start sm:gap-x-2"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-neo px-3 py-2 text-sm font-bold text-neo-cream/80 transition-colors hover:text-neo-lime"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default HomeEditorialNav;
