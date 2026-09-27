/**
 * Miss-gap practice card — shareable take-home after Unplugged Classroom assign.
 *
 * Query params mirror class-gap (lesson, teacher, found, total, missed, lang).
 * Student names never appear. noindex: share card, not an SEO landing.
 * Foil: Kahoot Classic Unplugged has no take-home practice PDF.
 */

import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { MissGapPracticeCard } from '@/components/education/MissGapPracticeCard';
import { MissGapShellLock } from '@/components/education/missGap/MissGapShellLock';
import {
  interpClassGapTemplate,
  parseClassGapShareParams,
  searchRecordToParams,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';
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

async function payloadFrom(props: PageProps): Promise<ClassGapSharePayload> {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  return parseClassGapShareParams(sp);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const payload = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const lesson = payload.lesson || readString(t, 'education.results.title', 'Lesson recap');
  const ogTitle = readString(
    t,
    'education.results.shareMissGapPracticeTitle',
    'Miss-gap practice card',
  );
  const description = payload.missedWords.length
    ? interpClassGapTemplate(
        readString(
          t,
          'education.results.shareMissGapPracticeText',
          '{{lesson}} — take-home practice: {{missed}}',
        ),
        { lesson, missed: payload.missedWords.join(', ') },
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
  const canonical = `${BASE}/${payload.locale}/education/miss-gap-practice`;

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

export default async function MissGapPracticePage(props: PageProps) {
  const payload = await payloadFrom(props);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';

  return (
    <main
      dir={dir}
      className="flex-1 min-h-0 max-h-dvh overflow-hidden bg-neo-navy flex flex-col"
      data-testid="miss-gap-practice-page"
    >
      {/* Two rules, both load-bearing.
          `flex-1 min-h-0` (not `h-dvh`): `<body>` is a flex column and this main
          sits under two more `flex-1 min-h-0` wrappers plus a `shrink-0` footer,
          so a fixed `100dvh` here would overflow the body's CONTENT box —
          `body.edu-shell-locked` is `height:100dvh` with border-box, and on a
          phone it still carries the bottom-nav reservation inside that height.
          Taking the available space instead can never overflow it.
          `MissGapShellLock`: `<body>` otherwise keeps `.screen-fit` plus the
          bottom-nav / cookie-sheet `padding-bottom` (441px measured at 390x844,
          for a document 1285px tall against an 844px viewport) — height, not
          overflow, so no `overflow:hidden` can remove it. The lock sizes the
          body to the viewport and moves the sheet clearance onto the one region
          that actually scrolls, `.edu-shell-scroll`. */}
      <MissGapShellLock chromeFree />
      <div className="edu-shell-scroll flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="min-h-full flex items-center justify-center">
          <MissGapPracticeCard payload={payload} />
        </div>
      </div>
    </main>
  );
}
