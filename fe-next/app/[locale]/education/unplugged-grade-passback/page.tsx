/**
 * Unplugged reteach grade passback receipt — Kahoot Classroom add-on foil.
 *
 * Teacher attachment view / turn-in receipt after Unplugged Live finish.
 * Query params mirror unplugged-reteach (+ points/max/cleared/onTime/completed).
 * noindex tool route — NON_LANDING. CSP allows Classroom iframe.
 */

import type { Metadata } from 'next';
import { UnpluggedReteachGradePassback } from '@/components/education/UnpluggedReteachGradePassback';
import { MissGapShellLock } from '@/components/education/missGap/MissGapShellLock';
import {
  parseClassGapShareParams,
  searchRecordToParams,
} from '@/lib/education/classGapShare';
import { normalizeDueDate } from '@/lib/education/missGapAsyncAssignment';
import {
  scoreUnpluggedReteach,
  unpluggedGradePassbackContentSecurityPolicy,
  type UnpluggedGradeScore,
  type UnpluggedPostState,
} from '@/lib/education/unpluggedReteachGradePassback';

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
  wordCount: number,
  dueDate: string,
): UnpluggedGradeScore | null {
  const pointsRaw = first(query.points);
  const maxRaw = first(query.max);
  const clearedRaw = first(query.cleared);
  const wordsRaw = first(query.words);
  const completed = first(query.completed) || first(query.completedOn);
  const onTimeRaw = first(query.onTime);
  const postStateRaw = first(query.postState);

  const total = wordsRaw && Number.isFinite(Number(wordsRaw))
    ? Math.max(0, Math.round(Number(wordsRaw)))
    : wordCount;
  const cleared = clearedRaw && Number.isFinite(Number(clearedRaw))
    ? Math.max(0, Math.round(Number(clearedRaw)))
    : total;

  if (!pointsRaw && !completed && onTimeRaw == null && !clearedRaw) {
    return wordCount > 0
      ? scoreUnpluggedReteach({
          cleared: wordCount,
          total: wordCount,
          dueDate: dueDate || undefined,
          completed: true,
        })
      : null;
  }

  const scored = scoreUnpluggedReteach({
    cleared,
    total,
    dueDate: dueDate || undefined,
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
    scored.postState = postStateRaw as UnpluggedPostState;
  }
  return scored;
}

async function payloadFrom(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  const payload = parseClassGapShareParams(sp);
  const dueDate = normalizeDueDate(sp.get('due'));
  const score = parseScore(query, payload.missedWords.length, dueDate);
  return { payload, score, dueDate };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'LexiClash — Unplugged grade passback',
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://www.lexiclash.live/${locale}/education/unplugged-grade-passback`,
    },
    other: {
      'Content-Security-Policy': unpluggedGradePassbackContentSecurityPolicy(),
    },
  };
}

export default async function UnpluggedGradePassbackPage(props: PageProps) {
  const { payload, score, dueDate } = await payloadFrom(props);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';

  return (
    <main
      dir={dir}
      className="flex-1 min-h-0 max-h-dvh overflow-hidden bg-neo-navy flex flex-col"
      data-testid="unplugged-grade-passback-page"
    >
      <MissGapShellLock />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 flex justify-center">
        <UnpluggedReteachGradePassback
          payload={payload}
          score={score}
          dueDate={dueDate || undefined}
        />
      </div>
    </main>
  );
}
