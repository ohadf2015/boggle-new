import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import { DAILY_CHALLENGE_EPOCH } from '@/utils/dailyChallenge/constants';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

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
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const archiveT = t?.daily?.archive || {
    title: 'Daily Challenge Archive',
    description: 'Browse past LexiClash daily challenges. See stats, leaderboards, and results from every puzzle.',
    ogTitle: 'Daily Challenge Archive - LexiClash',
    ogDescription: 'Explore past daily word puzzles with stats and leaderboards.',
  };

  const localePath = `/${locale}`;
  const baseUrl = 'https://www.lexiclash.live';

  return {
    title: archiveT.title,
    description: archiveT.description,
    openGraph: {
      type: 'website',
      url: `${baseUrl}${localePath}/daily/archive`,
      title: archiveT.ogTitle,
      description: archiveT.ogDescription,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: `${baseUrl}${localePath}/daily/archive`,
      languages: {
        'x-default': `${baseUrl}/en/daily/archive`,
        he: `${baseUrl}/he/daily/archive`,
        en: `${baseUrl}/en/daily/archive`,
        sv: `${baseUrl}/sv/daily/archive`,
        ja: `${baseUrl}/ja/daily/archive`,
        es: `${baseUrl}/es/daily/archive`,
        'en-IL': `${baseUrl}/en/daily/archive`,
        'he-IL': `${baseUrl}/he/daily/archive`,
        'en-US': `${baseUrl}/en/daily/archive`,
        'es-US': `${baseUrl}/es/daily/archive`,
        'en-GB': `${baseUrl}/en/daily/archive`,
        'en-SE': `${baseUrl}/en/daily/archive`,
        'sv-SE': `${baseUrl}/sv/daily/archive`,
        'en-JP': `${baseUrl}/en/daily/archive`,
        'ja-JP': `${baseUrl}/ja/daily/archive`,
        'en-ES': `${baseUrl}/en/daily/archive`,
        'es-ES': `${baseUrl}/es/daily/archive`,
        'en-MX': `${baseUrl}/en/daily/archive`,
        'es-MX': `${baseUrl}/es/daily/archive`,
        'en-AU': `${baseUrl}/en/daily/archive`,
        'es-AR': `${baseUrl}/es/daily/archive`,
        'es-CO': `${baseUrl}/es/daily/archive`,
      },
    },
    robots: { index: true, follow: true },
  };
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

  const localeMap: Record<string, string> = {
    he: 'he-IL', ja: 'ja-JP', sv: 'sv-SE', es: 'es-ES', en: 'en-US',
  };
  const dateLocale = localeMap[validLocale] || 'en-US';

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' });
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

          {/* Grouped by month */}
          {Object.entries(groupedByMonth).map(([monthKey, entries]) => (
            <section key={monthKey} className="mb-8">
              <h2 className="text-lg font-neo-display font-bold text-neo-cyan mb-3 border-b border-slate-700/50 pb-1">
                {formatMonth(monthKey)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entries.map(({ date, puzzleNumber }) => (
                  <Link
                    key={date}
                    href={`/${locale}/daily/archive/${date}`}
                    className="flex items-center justify-between bg-slate-900 border-2 border-neo-black rounded-neo p-3 shadow-hard-sm hover:border-neo-yellow hover:shadow-hard transition-all"
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
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
