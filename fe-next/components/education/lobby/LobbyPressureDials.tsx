/**
 * The teacher's pressure dials — the same game as a hyped game-show or a calm
 * mastery check (Quizizz's de-gameify toggles; evidence §8.8).
 *
 * Three rows, one per dial: leaderboard visibility, timer pressure, scoring
 * weight. They are PRO (or a live access trial): a free teacher sees them frozen on the loud defaults
 * with a lock and an upgrade link, because a control that is invisible cannot
 * be sold — and what is shown frozen is what the game will run, never a calm
 * draft the server will ignore.
 *
 * Gate semantics (pitfall class 1): while the entitlement is unresolved the
 * rows stay disabled — never painted enabled and yanked when the status read
 * comes back free, and no lock shown to a paying teacher while we check.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, Trophy, Timer, Target, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { pressureDialsUnlocked } from './pressureAccess';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { LobbyChoiceRow } from './LobbyChoiceRow';
import {
  DEFAULT_CLASSROOM_PRESSURE,
  normalizeClassroomPressure,
} from '@/shared/utils/classroomPressure';
import type { ClassroomPressure } from '@/shared/types/classroom';

const LEADERBOARD_CHOICES = ['full', 'top3', 'hidden'] as const;
const TIMER_CHOICES = ['full', 'gentle', 'off'] as const;

export interface LobbyPressureDialsProps {
  pressure: ClassroomPressure;
  onChange: (next: ClassroomPressure) => void;
}

export function LobbyPressureDials({ pressure, onChange }: LobbyPressureDialsProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading, accessTrialExpires } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const locked = !pressureDialsUnlocked({ hasPro, loading, accessTrialExpires: accessTrialExpires ?? null }, nowMs);

  useEffect(() => {
    if (!loading && locked) {
      trackGrowthEvent('iap_viewed', { source: 'pro_gate_pressureDials' });
    }
  }, [loading, locked]);

  // A free teacher sees the loud defaults frozen — the game runs what the
  // rows show, so the rows show what the game runs.
  const shown = locked ? DEFAULT_CLASSROOM_PRESSURE : normalizeClassroomPressure(pressure);

  return (
    <section
      data-testid="pressure-dials"
      className="space-y-3 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-3"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex min-w-[7.5rem] items-center gap-1.5 font-neo-display text-sm font-bold text-neo-cream">
          <Gauge className="size-4 shrink-0 text-neo-cream/70" strokeWidth={3} aria-hidden="true" />
          {t('teacher.classroom.pressure.title')}
          <span
            data-testid="pressure-pro-badge"
            className="rounded-neo bg-neo-yellow px-1.5 font-neo-display text-[0.65rem] font-black leading-tight text-neo-black"
          >
            {t('eduShell.host.proBadge')}
          </span>
        </span>
        {!loading && locked && (
          <Link
            href={`/${language}/teacher/upgrade`}
            data-testid="pressure-pro-lock"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-2 border-neo-cream/35 bg-transparent px-3 py-1 font-neo-display text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream/60"
          >
            <Lock className="size-3.5" strokeWidth={3} aria-hidden="true" />
            {t('teacher.proGate.pressureDials.title')}
          </Link>
        )}
      </div>

      <div data-testid="pressure-row-leaderboard">
        <LobbyChoiceRow
          id="lobby-pressure-leaderboard-label"
          label={t('teacher.classroom.pressure.leaderboard.title')}
          icon={Trophy}
          value={shown.leaderboard}
          disabled={locked}
          onChange={(leaderboard) => onChange({ ...shown, leaderboard })}
          choices={LEADERBOARD_CHOICES.map((v) => ({
            value: v,
            label: t(`teacher.classroom.pressure.leaderboard.${v}`),
          }))}
        />
      </div>

      <div data-testid="pressure-row-timer">
        <LobbyChoiceRow
          id="lobby-pressure-timer-label"
          label={t('teacher.classroom.pressure.timer.title')}
          icon={Timer}
          value={shown.timer}
          disabled={locked}
          onChange={(timer) => onChange({ ...shown, timer })}
          choices={TIMER_CHOICES.map((v) => ({
            value: v,
            label: t(`teacher.classroom.pressure.timer.${v}`),
          }))}
        />
      </div>

      <div data-testid="pressure-row-scoring">
        <LobbyChoiceRow
          id="lobby-pressure-scoring-label"
          label={t('teacher.classroom.pressure.scoring.title')}
          icon={Target}
          value={shown.speedScoring ? 'speed' : 'accuracy'}
          disabled={locked}
          onChange={(choice) => onChange({ ...shown, speedScoring: choice === 'speed' })}
          choices={(['speed', 'accuracy'] as const).map((v) => ({
            value: v,
            label: t(`teacher.classroom.pressure.scoring.${v}`),
          }))}
        />
      </div>
    </section>
  );
}

export default LobbyPressureDials;
