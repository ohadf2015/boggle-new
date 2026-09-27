import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTranslation } from '@/translations/loadTranslation';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { DAILY_CHALLENGE_EPOCH } from '@/utils/dailyChallenge/constants';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { InlineBannerAd } from '@/components/ads';

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface PageParams {
  params: Promise<{ locale: string }>;
}

/**
 * Get all valid puzzle dates from epoch to yesterday (today's puzzle is still live)
 */
function getArchiveDates(): Array<{ date: string; puzzleNumber: number }> {
  const dates: Array<{ date: string; puzzleNumber: number }> = [];
  const now = new Date();
  // Yesterday UTC — today's puzzle is still active
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));

  let current = new Date(DAILY_CHALLENGE_EPOCH);
  let puzzleNumber = 1;

  while (current <= yesterday) {
    dates.push({
      date: current.toISOString().split('T')[0],
      puzzleNumber,
    });
    current.setUTCDate(current.getUTCDate() + 1);
    puzzleNumber++;
  }

  return dates.reverse(); // Most recent first
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'dailyArchive', path: '/daily/archive', locale });
}

export default async function DailyArchivePage({ params }: PageParams) {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const archiveT = t?.daily?.archive || {
    title: 'Daily Challenge Archive',
    subtitle: 'Browse past puzzles and see how players performed',
    puzzleLabel: 'Puzzle',
    viewResults: 'View Results',
    puzzlesTotal: 'puzzles',
  };

  const dates = getArchiveDates();

  // Group by month for better organization
  const groupedByMonth: Record<string, typeof dates> = {};
  for (const entry of dates) {
    const monthKey = entry.date.substring(0, 7); // YYYY-MM
    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
    groupedByMonth[monthKey].push(entry);
  }

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return safeToLocaleDateString(date, validLocale, { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return safeToLocaleDateString(date, validLocale, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // JSON-LD schemas — all content is server-generated from trusted constants, no user input
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `https://www.lexiclash.live/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'Daily Challenge', item: `https://www.lexiclash.live/${locale}/daily` },
        { '@type': 'ListItem', position: 3, name: 'Archive', item: `https://www.lexiclash.live/${locale}/daily/archive` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: archiveT.title,
      description: 'Archive of all past LexiClash daily word challenges with statistics and leaderboards.',
      url: `https://www.lexiclash.live/${locale}/daily/archive`,
      isPartOf: { '@id': 'https://www.lexiclash.live/#website' },
      numberOfItems: dates.length,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <div className="min-h-screen bg-neo-navy text-neo-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/${locale}/daily`}
              className="text-neo-cyan text-sm hover:underline mb-2 inline-block"
            >
              ← {t.daily?.backToDaily || 'Back to Daily Challenge'}
            </Link>
            <h1 className="text-3xl font-neo-display font-black text-neo-yellow">
              {archiveT.title}
            </h1>
            <p className="text-slate-400 mt-1">
              {archiveT.subtitle}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {dates.length} {archiveT.puzzlesTotal || 'puzzles'}
            </p>
          </div>

          <InlineBannerAd webZone="content-page" className="mb-6" />

          {/* Grouped by month */}
          {Object.entries(groupedByMonth).map(([monthKey, entries], monthIdx) => (
            <section key={monthKey} className="mb-8">
              <h2 className="text-lg font-neo-display font-bold text-neo-cyan mb-3 border-b border-slate-700/50 pb-1">
                {formatMonth(monthKey)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entries.map(({ date, puzzleNumber }) => (
                  <Link
                    key={date}
                    href={`/${locale}/daily/archive/${date}`}
                    className="flex items-center justify-between bg-neo-navy border-2 border-neo-black rounded-neo p-3 shadow-hard-sm hover:border-neo-yellow hover:shadow-hard transition-all"
                  >
                    <div>
                      <span className="text-neo-white font-bold">
                        #{puzzleNumber}
                      </span>
                      <span className="text-slate-400 ms-2 text-sm">
                        {formatDate(date)}
                      </span>
                    </div>
                    <span className="text-neo-cyan text-sm font-medium">
                      {archiveT.viewResults || 'View'} →
                    </span>
                  </Link>
                ))}
              </div>
              {monthIdx === 2 && <InlineBannerAd webZone="content-page" className="mt-6" />}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
