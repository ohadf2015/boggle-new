import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { archiveCopy } from './archiveCopy';
import { loadTranslation } from '@/translations/loadTranslation';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { formatArchiveMonth, getArchiveDates, groupArchiveByMonth } from '@/utils/dailyChallenge/archiveDates';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import CatchUpDays from '@/components/daily/archive/CatchUpDays';
import { CATCH_UP_WINDOW_DAYS } from '@/utils/dailyChallenge/catchUp';
import { jsonLdGraph } from '@/lib/seo/jsonLdGraph';

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'dailyArchive', path: '/daily/archive', locale });
}

export default async function DailyArchivePage({ params }: PageParams) {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const tx = archiveCopy(await loadTranslation(validLocale) as Record<string, unknown>);

  const dates = getArchiveDates();
  const olderDates = dates.slice(CATCH_UP_WINDOW_DAYS);

  const groupedByMonth = groupArchiveByMonth(olderDates);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return safeToLocaleDateString(date, validLocale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
      name: 'Daily Challenge Archive',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph(schemas)) }}
      />
      <div className="min-h-screen bg-neo-navy text-neo-white">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <header className="mb-6">
            <Link
              href={`/${locale}/daily`}
              className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-neo-cyan hover:underline"
            >
              <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
              {tx('backToHub')}
            </Link>
            <h1 className="font-neo-display text-3xl font-black text-neo-yellow">{tx('title')}</h1>
            <p className="mt-1 text-neo-white/70">{tx('subtitle')}</p>
          </header>

          <section aria-labelledby="catch-up-heading" className="mb-10">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="catch-up-heading" className="font-neo-display text-xl font-black text-neo-white">
                {tx('catchUpTitle')}
              </h2>
              <span className="rounded-full border-neo border-neo-black bg-neo-lime px-2.5 py-0.5 text-xs font-black text-neo-black">
                {tx('catchUpHint')}
              </span>
            </div>
            <CatchUpDays />
          </section>

          <section aria-labelledby="older-heading">
            <h2 id="older-heading" className="font-neo-display text-xl font-black text-neo-white">
              {tx('olderTitle')}
            </h2>
            <p className="mb-3 text-sm text-neo-white/60">
              {tx('olderHint')} · {tx('count', { n: olderDates.length })}
            </p>
            <div className="grid gap-2">
              {Object.entries(groupedByMonth).map(([monthKey, entries], monthIdx) => (
                <details
                  key={monthKey}
                  open={monthIdx === 0}
                  className="group rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard-sm"
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 font-neo-display font-black text-neo-cyan [&::-webkit-details-marker]:hidden">
                    {formatArchiveMonth(monthKey, validLocale)}
                    <span className="text-xs font-bold text-neo-white/50">{entries.length}</span>
                    <ChevronDown aria-hidden className="ms-auto h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="grid grid-cols-3 gap-2 px-3 pb-3 sm:grid-cols-5">
                    {entries.map(({ date, puzzleNumber }) => (
                      <li key={date}>
                        <Link
                          href={`/${locale}/daily/archive/${date}`}
                          className="flex flex-col items-center rounded-neo border-neo border-neo-black bg-neo-navy px-2 py-2 text-center transition-colors hover:border-neo-yellow"
                        >
                          <bdi className="font-neo-display font-black text-neo-white">#{puzzleNumber}</bdi>
                          <span className="text-xs text-neo-white/60">{formatDate(date)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
