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
import { MissGapShellLock } from '@/components/education/missGap/MissGapShellLock';
import { MissGapExitLink } from '@/components/education/missGap/MissGapExitLink';
import { interpClassGapTemplate } from '@/lib/education/classGapShare';
import { resolveMissGapEntryFromRecord } from '@/lib/education/missGapEntry';
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

// Audience + payload both come from `missGapEntry`, which is the one place
// that decides whether a URL is the teacher's compose card or the student's
// game — and which guarantees a bare URL still opens something playable.
// `defs=word|meaning~word|meaning` upgrades the rounds from "which spelling is
// right" to "tap the meaning"; absent, the game falls back to spelling +
// tap-to-spell rounds, which always build.
async function payloadFrom(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  return resolveMissGapEntryFromRecord(query, locale);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { payload } = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const lesson = payload.lesson || readString(t, 'education.results.title', 'Lesson recap');
  const ogTitle = interpClassGapTemplate(
    readString(
      t,
      'education.results.assignMissGapAsyncTitle',
      'Async miss-gap homework — {{lesson}}',
    ),
    { lesson },
  );
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
    // Locked shell, one inner scroll region — the page body never scrolls, so
    // the homework game can take the viewport without fighting it.
    <main
      dir={dir}
      className="flex-1 min-h-0 max-h-dvh overflow-hidden bg-neo-navy flex flex-col"
      data-testid="miss-gap-assignment-page"
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
        {/* `min-h-full` + `items-center`, not a bare `flex justify-center`.
            A stretched flex child made the teacher card's `lg:grid` fill the
            whole 856px region, so its rows resolved to `589px 215px` around
            420px and 46px of content and the take-home disclosure floated
            190px below the compose card it belongs to. Centring hands the grid
            its content height back; `min-h-full` keeps a tall card pinned to
            the top of the scroll region instead of clipping its head. */}
        <div className="min-h-full flex flex-col items-center justify-center gap-3">
          {teacherMode ? (
            // Same max-width as the card so the arrow lines up with its edge,
            // and a block wrapper so `dir=rtl` moves it to the right edge.
            <div className="w-full max-w-xl lg:max-w-5xl">
              <MissGapExitLink locale={payload.locale} />
            </div>
          ) : null}
          <MissGapAsyncAssignment payload={payload} teacherMode={teacherMode} />
        </div>
      </div>
    </main>
  );
}
