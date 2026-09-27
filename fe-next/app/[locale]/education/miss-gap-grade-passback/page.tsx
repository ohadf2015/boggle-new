/**
 * Miss-gap grade passback receipt — Kahoot Marketplace grade-passback foil.
 *
 * Student attachment view / turn-in receipt for #975 async homework.
 * Query params mirror miss-gap-assignment (+ points/max/onTime/completed).
 * noindex tool route — NON_LANDING. CSP allows Classroom iframe.
 */

import type { Metadata } from 'next';
import { MissGapGradePassback } from '@/components/education/MissGapGradePassback';
import { MissGapShellLock } from '@/components/education/missGap/MissGapShellLock';
import {
  parseClassGapShareParams,
  searchRecordToParams,
} from '@/lib/education/classGapShare';
import {
  normalizeDueDate,
  toMissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import {
  missGapGradePassbackContentSecurityPolicy,
  scoreMissGapHomework,
  type MissGapGradeScore,
  type MissGapPostState,
} from '@/lib/education/missGapGradePassback';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseScore(
  query: Record<string, string | string[] | undefined>,
  dueDate: string,
): MissGapGradeScore | null {
  const pointsRaw = first(query.points);
  const maxRaw = first(query.max);
  const completed = first(query.completed) || first(query.completedOn);
  const onTimeRaw = first(query.onTime);
  const postStateRaw = first(query.postState);

  if (!pointsRaw && !completed && onTimeRaw == null) {
    return dueDate
      ? scoreMissGapHomework({ dueDate, completed: true })
      : null;
  }

  const scored = scoreMissGapHomework({
    dueDate,
    completedOn: completed || undefined,
    completed: true,
    maxPoints: maxRaw ? Number(maxRaw) : undefined,
  });

  if (pointsRaw != null && pointsRaw !== '') {
    const points = Number(pointsRaw);
    if (Number.isFinite(points) && points >= 0) {
      scored.pointsEarned = Math.min(scored.maxPoints, Math.round(points));
    }
  }
  if (onTimeRaw === '0' || onTimeRaw === 'false') scored.onTime = false;
  if (onTimeRaw === '1' || onTimeRaw === 'true') scored.onTime = true;
  if (
    postStateRaw === 'NEW' ||
    postStateRaw === 'TURNED_IN' ||
    postStateRaw === 'RETURNED'
  ) {
    scored.postState = postStateRaw as MissGapPostState;
  }
  return scored;
}

async function payloadFrom(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  const base = parseClassGapShareParams(sp);
  const dueDate = normalizeDueDate(sp.get('due'));
  const payload = toMissGapAssignmentPayload({ ...base, dueDate });
  const score = parseScore(query, dueDate);
  return { payload, score };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'LexiClash — Miss-gap grade passback',
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://www.lexiclash.live/${locale}/education/miss-gap-grade-passback`,
    },
    other: {
      'Content-Security-Policy': missGapGradePassbackContentSecurityPolicy(),
    },
  };
}

export default async function MissGapGradePassbackPage(props: PageProps) {
  const { payload, score } = await payloadFrom(props);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';

  return (
    <main
      dir={dir}
      className="flex-1 min-h-0 max-h-dvh overflow-hidden bg-neo-navy flex flex-col"
      data-testid="miss-gap-grade-passback-page"
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
          <MissGapGradePassback payload={payload} score={score} />
        </div>
      </div>
    </main>
  );
}
