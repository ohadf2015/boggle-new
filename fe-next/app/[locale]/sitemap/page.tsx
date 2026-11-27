import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingPage } from '@/components/landing/kit';
import { loadTranslation } from '@/translations/loadTranslation';
import { getHelpContent } from '@/components/education/help/content';
import { HELP_POPULAR, helpArticleHref } from '@/components/education/help/helpRegistry';
import { servesHelp } from '@/components/education/help/helpTypes';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'he' ? 'מפת אתר - לקסיקלאש' : 'Sitemap - LexiClash',
    description: locale === 'he'
      ? 'כל הדפים באתר לקסיקלאש - משחק מילים מרובה משתתפים חינם'
      : 'All pages on LexiClash - Free multiplayer word game',
  };
}

const SECTIONS = [
  {
    titleKey: 'sitemap.gameModes',
    fallback: 'Game Modes',
    links: [
      { href: '/quick-play', labelKey: 'sitemap.singleplayer', fallback: 'Single Player' },
      { href: '/multiplayer', labelKey: 'sitemap.multiplayer', fallback: 'Multiplayer' },
      { href: '/daily', labelKey: 'sitemap.daily', fallback: 'Daily Challenge' },
      { href: '/daily/word-hunt', labelKey: 'sitemap.wordHunt', fallback: 'Word Hunt' },
      { href: '/daily/word-wheel', labelKey: 'sitemap.wordWheel', fallback: 'Word Wheel' },
      { href: '/blast', labelKey: 'sitemap.blast', fallback: 'Blast Mode' },
      { href: '/adventure', labelKey: 'sitemap.adventure', fallback: 'Adventure Mode' },
      { href: '/connections', labelKey: 'connections.title', fallback: 'Word Bridge' },
      { href: '/daily/archive', labelKey: 'daily.archivePage.title', fallback: 'Past puzzles' },
    ],
  },
  {
    titleKey: 'sitemap.tools',
    fallback: 'Tools & Resources',
    links: [
      { href: '/tools', labelKey: 'sitemap.tools', fallback: 'Tools & Resources' },
      { href: '/tools/word-solver', labelKey: 'footer.wordSolver', fallback: 'Word Solver' },
      { href: '/word-of-the-day', labelKey: 'footer.wordOfTheDay', fallback: 'Word of the Day' },
      { href: '/glossary', labelKey: 'footer.glossary', fallback: 'Glossary' },
      { href: '/leaderboard', labelKey: 'footer.leaderboard', fallback: 'Leaderboard' },
      { href: '/words', labelKey: 'sitemap.words', fallback: 'Word Lists' },
    ],
  },
  {
    titleKey: 'sitemap.guides',
    fallback: 'Guides & Learning',
    links: [
      { href: '/how-to-play', labelKey: 'footer.howToPlay', fallback: 'How to Play' },
      { href: '/guides', labelKey: 'footer.guides', fallback: 'Guides' },
      { href: '/guides/classic-strategy', labelKey: 'sitemap.classicStrategy', fallback: 'Classic Strategy Guide' },
      { href: '/guides/blast-strategy', labelKey: 'sitemap.blastStrategy', fallback: 'Blast Strategy Guide' },
      { href: '/guides/word-hunt-strategy', labelKey: 'sitemap.wordHuntStrategy', fallback: 'Word Hunt Strategy Guide' },
      { href: '/education', labelKey: 'sitemap.education', fallback: 'Education' },
      { href: '/education/classroom-game', labelKey: 'education.header.breadcrumbs.classroomGame', fallback: 'Classroom Game' },
      { href: '/education/duels', labelKey: 'education.header.breadcrumbs.duels', fallback: 'Duels' },
    ],
  },
  {
    titleKey: 'sitemap.community',
    fallback: 'Community & Content',
    links: [
      { href: '/blog', labelKey: 'footer.blog', fallback: 'Blog' },
      { href: '/community', labelKey: 'sitemap.communityPage', fallback: 'Community' },
      { href: '/faq', labelKey: 'footer.faq', fallback: 'FAQ' },
    ],
  },
  {
    titleKey: 'sitemap.about',
    fallback: 'About & Legal',
    links: [
      { href: '/about', labelKey: 'footer.about', fallback: 'About' },
      { href: '/about/ohad-fisher', labelKey: 'sitemap.theWordNerd', fallback: 'Ohad Fisher' },
      { href: '/contact', labelKey: 'footer.contact', fallback: 'Contact' },
      { href: '/legal', labelKey: 'legal.title', fallback: 'Legal' },
      { href: '/legal/privacy', labelKey: 'legal.privacyPolicy', fallback: 'Privacy Policy' },
      { href: '/legal/terms', labelKey: 'legal.termsOfService', fallback: 'Terms of Service' },
      { href: '/legal/cookies', labelKey: 'footer.cookiePolicy', fallback: 'Cookie Policy' },
      { href: '/legal/disclaimer', labelKey: 'sitemap.disclaimer', fallback: 'Disclaimer' },
      { href: '/accessibility', labelKey: 'sitemap.accessibility', fallback: 'Accessibility' },
    ],
  },
] as const;

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export default async function SitemapPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await loadTranslation(locale as 'en' | 'he' | 'sv' | 'ja' | 'es') as Record<string, unknown>;

  const resolve = (key: string, fallback: string) => getNestedValue(t, key) || fallback;
  const helpArticles = servesHelp(locale) ? getHelpContent(locale).articles : null;

  const CARD = 'flex flex-col overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';
  const TONES = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-yellow', 'bg-neo-purple', 'bg-neo-orange'];
  const LINK = 'block rounded-neo px-2 py-1 text-[15px] font-medium hover:bg-neo-yellow';

  return (
    <LandingPage locale={locale}>
      <header className="lg:pt-6">
        <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] sm:text-5xl">
          {resolve('sitemap.title', 'Sitemap')}
        </h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section, i) => (
          <div key={section.titleKey} className={CARD}>
            <h2 className={`border-b-3 border-neo-black px-5 py-3 font-neo-display text-lg font-bold ${TONES[i % TONES.length]}`}>
              {resolve(section.titleKey, section.fallback)}
            </h2>
            <ul className="space-y-0.5 p-3">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={`/${locale}${link.href}`} className={LINK}>
                    {resolve(link.labelKey, link.fallback)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {helpArticles && (
          <div className={CARD}>
            <h2 className={`border-b-3 border-neo-black px-5 py-3 font-neo-display text-lg font-bold ${TONES[SECTIONS.length % TONES.length]}`}>
              {resolve('footer.forTeachers', 'For Teachers')}
            </h2>
            <ul className="space-y-0.5 p-3">
              {HELP_POPULAR.filter((slug) => helpArticles[slug]).map((slug) => (
                <li key={slug}>
                  <Link href={helpArticleHref(locale, slug)} className={LINK}>
                    {helpArticles[slug].title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </LandingPage>
  );
}
