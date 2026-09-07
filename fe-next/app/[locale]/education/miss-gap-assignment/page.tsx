/**
 * Async miss-gap homework assignment — Kahootopia Assignments foil.
 *
 * Query params mirror miss-gap-practice (+ due=YYYY-MM-DD). Teacher sets due
 * date; students practise via the #972 card; on-time completion feeds class streak.
 * NOT a live Unplugged session. noindex: tool route, not SEO landing.
 */

import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { MissGapAsyncAssignment } from '@/components/education/MissGapAsyncAssignment';
import {
  interpClassGapTemplate,
  parseClassGapShareParams,
  searchRecordToParams,
} from '@/lib/education/classGapShare';
import {
  normalizeDueDate,
  toMissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import { buildMissGapPracticeOgImageUrl } from '@/lib/education/missGapPracticeShare';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = 'https://www.lexiclash.live';

function readString(catalogue: unknown, path: string, fallback: string): string {
  let node: unknown = catalogue;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return fallback;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : fallback;
}

async function payloadFrom(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  const base = parseClassGapShareParams(sp);
  const dueDate = normalizeDueDate(sp.get('due'));
  const role = String(sp.get('role') || '').toLowerCase();
  return {
    payload: toMissGapAssignmentPayload({ ...base, dueDate }),
    teacherMode: role === 'teacher' || !dueDate,
  };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { payload } = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const lesson = payload.lesson || readString(t, 'education.results.title', 'Lesson recap');
  const ogTitle = readString(
    t,
    'education.results.assignMissGapAsyncTitle',
    'Async miss-gap homework — {{lesson}}',
  ).replace('{{lesson}}', lesson);
  const description = payload.missedWords.length
    ? interpClassGapTemplate(
        readString(
          t,
          'education.results.assignMissGapAsyncShareText',
          '{{lesson}} — async miss-gap homework due {{due}}: {{missed}}',
        ),
        {
          lesson,
          missed: payload.missedWords.join(', '),
          due: payload.dueDate || '—',
        },
      )
    : interpClassGapTemplate(
        readString(t, 'education.results.shareGapAllFoundText', '{{lesson}} — every word found'),
        { lesson },
      );
  const ogImage = buildMissGapPracticeOgImageUrl({
    locale: payload.locale,
    lessonNames: payload.lesson ? [payload.lesson] : [],
    teacherName: payload.teacher,
    found: payload.found,
    total: payload.total,
    missedWords: payload.missedWords,
  });
  const canonical = `${BASE}/${payload.locale}/education/miss-gap-assignment`;

  return {
    title: ogTitle,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title: ogTitle,
      description,
      siteName: 'LexiClash',
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [ogImage],
    },
    alternates: { canonical },
  };
}

export default async function MissGapAssignmentPage(props: PageProps) {
  const { payload, teacherMode } = await payloadFrom(props);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';

  return (
    <main
      dir={dir}
      className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
      data-testid="miss-gap-assignment-page"
    >
      <MissGapAsyncAssignment payload={payload} teacherMode={teacherMode} />
    </main>
  );
}
