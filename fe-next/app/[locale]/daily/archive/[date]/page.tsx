import type { Metadata } from 'next';
import Link from 'next/link';
import { translations } from '@/translations';
import { DAILY_CHALLENGE_EPOCH } from '@/utils/dailyChallenge/constants';
import { getPuzzleNumber } from '@/utils/dailyChallenge';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const BASE_URL = 'https://www.lexiclash.live';

interface PageParams {
  params: Promise<{ locale: string; date: string }>;
}

function isValidArchiveDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(date.getTime())) return false;
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(23, 59, 59, 999);
  return date >= DAILY_CHALLENGE_EPOCH && date <= yesterday;
}

async function fetchPuzzleStats(date: string, language: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/daily-challenge/word-hunt/stats/${date}/${language}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json() as {
      totalPlayers: number;
      solvedCount: number;
      solveRate: number;
      attemptDistribution: Record<string, number>;
      avgAttemptsSolved: number;
    };
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const params: Array<{ locale: string; date: string }> = [];
  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));

  for (let i = 0; i < 30; i++) {
    const date = new Date(yesterday);
    date.setUTCDate(date.getUTCDate() - i);
    if (date < DAILY_CHALLENGE_EPOCH) break;
    const dateStr = date.toISOString().split('T')[0];
    for (const locale of LOCALES) {
      params.push({ locale, date: dateStr });
    }
  }
  return params;
}

export const dynamicParams = true;
export const revalidate = 21600;

const LOCALE_MAP: Record<string, string> = {
  he: 'he-IL', ja: 'ja-JP', sv: 'sv-SE', es: 'es-ES', en: 'en-US',
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, date } = await params;
  const validLocale = (locale as Locale) || 'en';

  if (!isValidArchiveDate(date)) {
    return { title: 'Not Found' };
  }

  const puzzleNumber = getPuzzleNumber(date);
  const formattedDate = new Date(date + 'T00:00:00Z').toLocaleDateString(
    LOCALE_MAP[validLocale] || 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  const title = `Daily Challenge #${puzzleNumber} - ${formattedDate} | LexiClash`;
  const description = `Results and leaderboard for LexiClash Daily Challenge #${puzzleNumber} (${formattedDate}). See how players performed on this word puzzle.`;

  const localePath = `/${locale}`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url: `${BASE_URL}${localePath}/daily/archive/${date}`,
      title,
      description,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: `${BASE_URL}${localePath}/daily/archive/${date}`,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/daily/archive/${date}`],
        ...LOCALES.map(l => [l, `${BASE_URL}/${l}/daily/archive/${date}`]),
      ]),
    },
    robots: { index: true, follow: true },
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border-2 border-neo-black rounded-neo p-3 text-center shadow-hard-sm">
      <div className="text-xl font-black text-neo-white">{value}</div>
      <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

export default async function DailyArchiveDatePage({ params }: PageParams) {
  const { locale, date } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = translations[validLocale] || translations.en;

  if (!isValidArchiveDate(date)) {
    return (
      <div className="min-h-screen bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-neo-display font-black text-neo-yellow mb-4">
            {'Puzzle Not Found'}
          </h1>
          <Link href={`/${locale}/daily/archive`} className="text-neo-cyan hover:underline">
            ← Back to Archive
          </Link>
        </div>
      </div>
    );
  }

  const puzzleNumber = getPuzzleNumber(date);
  const stats = await fetchPuzzleStats(date, validLocale);
  const dateLocale = LOCALE_MAP[validLocale] || 'en-US';
  const formattedDate = new Date(date + 'T00:00:00Z').toLocaleDateString(dateLocale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Prev/Next navigation
  const prevDate = new Date(date + 'T00:00:00Z');
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const nextDate = new Date(date + 'T00:00:00Z');
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const hasPrev = prevDate >= DAILY_CHALLENGE_EPOCH;
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const hasNext = nextDate <= yesterday;
  const prevDateStr = prevDate.toISOString().split('T')[0];
  const nextDateStr = nextDate.toISOString().split('T')[0];

  // JSON-LD — server-generated trusted data only
  const schemaJson = JSON.stringify([{
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Daily Challenge', item: `${BASE_URL}/${locale}/daily` },
      { '@type': 'ListItem', position: 3, name: 'Archive', item: `${BASE_URL}/${locale}/daily/archive` },
      { '@type': 'ListItem', position: 4, name: `#${puzzleNumber}`, item: `${BASE_URL}/${locale}/daily/archive/${date}` },
    ],
  }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <div className="min-h-screen bg-neo-navy text-neo-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link href={`/${locale}/daily/archive`} className="text-neo-cyan text-sm hover:underline">
              ← Archive
            </Link>
            <div className="flex gap-3 text-sm">
              {hasPrev && (
                <Link href={`/${locale}/daily/archive/${prevDateStr}`} className="text-slate-400 hover:text-neo-cyan">
                  ← #{puzzleNumber - 1}
                </Link>
              )}
              {hasNext && (
                <Link href={`/${locale}/daily/archive/${nextDateStr}`} className="text-slate-400 hover:text-neo-cyan">
                  #{puzzleNumber + 1} →
                </Link>
              )}
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-neo-display font-black text-neo-yellow">
              Puzzle #{puzzleNumber}
            </h1>
            <p className="text-slate-400 mt-1">{formattedDate}</p>
          </div>

          {/* Stats */}
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="Players" value={stats.totalPlayers.toLocaleString(dateLocale)} />
              <StatCard label="Solve Rate" value={`${Math.round(stats.solveRate)}%`} />
              <StatCard label="Solved" value={stats.solvedCount.toLocaleString(dateLocale)} />
              <StatCard label="Avg Attempts" value={stats.avgAttemptsSolved?.toFixed(1) || '-'} />
            </div>
          ) : (
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo p-6 mb-8 text-center">
              <p className="text-slate-400">Stats not available for this puzzle yet.</p>
            </div>
          )}

          {/* Attempt distribution */}
          {stats?.attemptDistribution && (
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo p-4 mb-8">
              <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-3">
                Attempt Distribution
              </h2>
              <div className="space-y-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(attempt => {
                  const count = stats.attemptDistribution[String(attempt)] || 0;
                  const maxCount = Math.max(...Object.values(stats.attemptDistribution).map(Number));
                  const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={attempt} className="flex items-center gap-2 text-sm">
                      <span className="w-4 text-slate-400 text-end">{attempt}</span>
                      <div className="flex-1 h-5 bg-slate-800 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm ${attempt <= 2 ? 'bg-green-500' : attempt <= 4 ? 'bg-neo-cyan' : attempt <= 6 ? 'bg-neo-yellow' : 'bg-neo-orange'}`}
                          style={{ width: `${Math.max(width, count > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                      <span className="w-10 text-slate-500 text-end text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="text-center mt-8">
            <Link
              href={`/${locale}/daily`}
              className="inline-block bg-neo-yellow text-neo-black font-neo-display font-black px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
            >
              {"Play Today's Puzzle"} →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
