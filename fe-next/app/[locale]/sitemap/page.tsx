import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTranslation } from '@/translations/loadTranslation';

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
      { href: '/singleplayer', labelKey: 'sitemap.singleplayer', fallback: 'Single Player' },
      { href: '/multiplayer', labelKey: 'sitemap.multiplayer', fallback: 'Multiplayer' },
      { href: '/daily', labelKey: 'sitemap.daily', fallback: 'Daily Challenge' },
      { href: '/daily/word-hunt', labelKey: 'sitemap.wordHunt', fallback: 'Word Hunt' },
      { href: '/daily/word-wheel', labelKey: 'sitemap.wordWheel', fallback: 'Word Wheel' },
      { href: '/blast', labelKey: 'sitemap.blast', fallback: 'Blast Mode' },
      { href: '/adventure', labelKey: 'sitemap.adventure', fallback: 'Adventure Mode' },
    ],
  },
  {
    titleKey: 'sitemap.tools',
    fallback: 'Tools & Resources',
    links: [
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

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-black uppercase text-neo-yellow mb-8 neo-title">
          {resolve('sitemap.title', 'Sitemap')}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {SECTIONS.map((section) => (
            <div key={section.titleKey}>
              <h2 className="text-sm font-black uppercase tracking-widest text-neo-yellow mb-3">
                {resolve(section.titleKey, section.fallback)}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={`/${locale}${link.href}`}
                      className="text-sm text-neo-white hover:text-neo-cyan transition-colors duration-100"
                    >
                      {resolve(link.labelKey, link.fallback)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
