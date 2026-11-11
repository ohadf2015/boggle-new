'use client';

/**
 * DEV-ONLY harness for the daily streak UI, from fixtures (no account needed).
 * Route: /[locale]/dev/streak?days=7&risk=1 — one card; add `&reveal=1` for the
 * milestone claim, `&sheet=1` for the freeze sheet, `&freezes=2` for a full bank.
 * Without `days` it shows every tier side by side.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StreakCard, type StreakCardView } from '@/components/streak/StreakCard';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { StreakAtRiskPill } from '@/components/streak/StreakAtRiskPill';
import { StreakMilestoneReveal } from '@/components/streak/StreakMilestoneReveal';
import { StreakFreezeSheet } from '@/components/streak/StreakFreezeSheet';
import { claimableMilestone, nextMilestone, weekStrip } from '@/lib/daily/streakRewards';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

const TIER_DAYS = [0, 2, 5, 9, 20, 45];

function shift(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fixture(days: number, atRisk: boolean, freezes: number, claim: boolean): StreakCardView {
  const today = getDailyChallengeDate();
  const end = atRisk ? shift(today, -1) : today;
  const played = Array.from({ length: days }, (_, i) => shift(end, -i)).filter((d) => d !== shift(today, -2) || days < 4);
  const frozen = days >= 4 ? [shift(today, -2)] : [];
  const claimed = claim ? [] : [3, 7, 14, 30].filter((m) => m <= days);
  return {
    current: days,
    playedToday: !atRisk && days > 0,
    atRisk: atRisk && days > 0,
    freezes,
    isGuest: false,
    week: weekStrip(played, frozen, today),
    milestone: { claimable: claimableMilestone(days, claimed), next: nextMilestone(days, claimed) },
  };
}

function StreakHarness() {
  const params = useSearchParams();
  const risk = params.get('risk') === '1';
  const freezes = Number(params.get('freezes') ?? 1);
  const daysParam = params.get('days');

  if (daysParam === null) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
        <div className="flex flex-wrap items-end gap-6">
          {TIER_DAYS.map((d) => (
            <div key={d} className="flex flex-col items-center gap-1 text-neo-cream">
              <StreakFlame days={d} size={96} />
              <span className="font-neo-display text-sm font-bold">{d}</span>
            </div>
          ))}
        </div>
        <StreakAtRiskPill days={6} className="self-start" />
        <div className="grid gap-4 md:grid-cols-2">
          {TIER_DAYS.slice(1).map((d, i) => (
            <StreakCard key={d} view={fixture(d, i % 2 === 0, freezes, false)} />
          ))}
        </div>
      </main>
    );
  }

  const days = Number(daysParam);
  const view = fixture(days, risk, freezes, params.get('claim') === '1');
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <StreakCard view={view} />
      {params.get('reveal') === '1' && (
        <StreakMilestoneReveal milestone={claimableMilestone(days, []) ?? { days: 7, coins: 60 }} source="dev" onClose={() => {}} />
      )}
      <StreakFreezeSheet
        open={params.get('sheet') === '1'}
        freezes={freezes}
        isGuest={params.get('guest') === '1'}
        onSignIn={() => {}}
        onClose={() => {}}
        onBought={() => {}}
      />
    </main>
  );
}

export default function StreakDevPage() {
  return (
    <Suspense fallback={null}>
      <StreakHarness />
    </Suspense>
  );
}
