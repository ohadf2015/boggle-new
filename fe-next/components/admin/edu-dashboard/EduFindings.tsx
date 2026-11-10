'use client';

import { useMemo } from 'react';
import { AlertTriangle, Radar, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Finding, FindingTone } from '@/lib/admin/eduFindings';
import {
  FUNNEL_LABEL_FALLBACK,
  MUTED,
  PANEL,
  teacherName,
  useTeacherIndex,
  weekdayLabels,
  type ActiveDrill,
  type EduDashboardView,
  type Translate,
} from './eduDashboardShared';

const TONE: Record<FindingTone, { icon: LucideIcon; ring: string; text: string }> = {
  win: { icon: TrendingUp, ring: 'border-neo-lime', text: 'text-neo-lime' },
  problem: { icon: AlertTriangle, ring: 'border-neo-red', text: 'text-neo-red' },
  early: { icon: Radar, ring: 'border-neo-orange', text: 'text-neo-orange' },
  fact: { icon: Sparkles, ring: 'border-neo-cyan', text: 'text-neo-cyan' },
};

/** Plain-language sentence per finding id. English fallbacks double as the copy. */
function sentence(f: Finding, t: Translate, ctx: { weekday: (i: number) => string; nameOf: (id: string) => string; step: (k: string) => string }): string {
  const p = f.params;
  const k = `admin.eduDashboard.finding.${f.id}`;
  switch (f.id) {
    case 'rounds_up': return t(k, 'Classes are playing {pct}% more: {current} games this period.', p);
    case 'rounds_down': return t(k, 'Class games fell {pct}%, from {prior} to {current}.', p);
    case 'new_teachers_up': return t(k, '{current} teachers approved, {pct}% more than before.', p);
    case 'retention_good': return t(k, '{pct}% of last period’s teachers taught again. They are sticking.', p);
    case 'retention_low': return t(k, 'Only {pct}% of last period’s teachers taught again. {lost} went quiet.', p);
    case 'funnel_drop': return t(k, 'Biggest leak: {lost} teachers got as far as “{from}” and never reached “{to}”.', { ...p, from: ctx.step(String(p.from)), to: ctx.step(String(p.to)) });
    case 'thriving': return t(k, '{count} teachers are thriving: recently active and running games.', p);
    case 'dormant_many': return t(k, '{count} of {total} teachers are dormant. Most of the roster is asleep.', p);
    case 'trials_expiring': return t(k, '{count} free trials end within 7 days. A message now can still turn them into Pro.', p);
    case 'trials_lapsed': return t(k, '{count} teachers finished the trial and did not pay.', p);
    case 'conversion_good': return t(k, '{pct}% of finished trials turned into paying teachers.', p);
    case 'conversion_low': return t(k, 'Only {pct}% of finished trials turned into paying teachers.', p);
    case 'classes_dying': return t(k, '{count} classes with students have not played for two weeks.', p);
    case 'empty_classes': return t(k, '{count} of {total} classes have no students. The join code never got shared.', p);
    case 'teachers_fading': return t(k, '{count} teachers still teach but at half the pace of last period. They are fading.', p);
    case 'at_risk_with_students': return t(k, '{count} teachers with students have gone quiet. Reach them before they drop off.', p);
    case 'trial_idle': return t(k, '{count} trials end within 7 days and the teacher has not run a game this week.', p);
    case 'activity_stopped': return t(k, 'No class games for {days} days after a busy period. Check for an outage or broken tracking.', p);
    case 'momentum_drop': return t(k, 'Games fell {pct}% in the last 3 days against the rest of this period. The weekly total will show it soon.', p);
    case 'one_teacher_carries': return t(k, '{pct}% of all games come from {name}. If they stop, usage collapses.', { ...p, name: ctx.nameOf(String(p.teacherId)) });
    case 'stuck_locked_out': return t(k, '{count} approved teachers cannot sign in. The approval never gave them the teacher role.', p);
    case 'stuck_no_class': return t(k, '{count} approved teachers signed in and never made a class.', p);
    case 'stuck_no_students': return t(k, '{count} teachers made a class and no student joined. The join code is not getting shared.', p);
    case 'mode_small': return t(k, '{modes} get only {avg} students per game against {overall} overall. Classes are not using it together.', p);
    case 'mode_one_and_done': return t(k, 'Most teachers try {modes} once and never run it again.', p);
    case 'mode_fading': return t(k, '{modes} lost at least half its games against the previous period.', p);
    case 'top_mode': return t(k, '{mode} is the favourite: {pct}% of all class games.', p);
    case 'small_games': return t(k, 'Games average {avg} students. Teachers may be testing alone, not teaching.', p);
    case 'peak_day': return t(k, 'Teaching peaks on {day}. Ship and message before it.', { day: ctx.weekday(Number(p.weekday)) });
    case 'top_teacher': return t(k, '{name} ran the most games: {rounds} games, {players} student seats.', { ...p, name: ctx.nameOf(String(p.teacherId)) });
    default: return f.id;
  }
}

function Column({
  title,
  empty,
  items,
  render,
  onDrill,
  testId,
}: {
  title: string;
  empty: string;
  items: Finding[];
  render: (f: Finding) => string;
  onDrill: (d: ActiveDrill) => void;
  testId: string;
}) {
  const { t } = useLanguage();
  return (
    <section data-testid={testId} className={`${PANEL} space-y-2`}>
      <h3 className="text-sm font-semibold text-neo-cream">{title}</h3>
      {items.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((f) => {
            const { icon: Icon, ring, text } = TONE[f.tone];
            const { drill } = f;
            const message = render(f);
            return (
              <li key={f.id} data-testid={`finding-${f.id}`} className={`flex items-start gap-2 rounded border-s-4 ps-2 ${ring}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} aria-hidden="true" />
                <div className="min-w-0 text-sm text-neo-cream">
                  <p>{message}</p>
                  {drill && drill.ids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onDrill({ ...drill, title: message })}
                      className="text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neo-cyan"
                    >
                      {t('admin.eduDashboard.finding.show', 'Show them ({count})', { count: drill.ids.length })}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function EduFindings({ data, onDrill }: { data: EduDashboardView; onDrill: (d: ActiveDrill) => void }) {
  const { t, language } = useLanguage();
  const teachers = useTeacherIndex(data.teachers);
  const weekdays = useMemo(() => weekdayLabels(language, 'long'), [language]);
  const ctx = {
    weekday: (i: number) => weekdays[i],
    nameOf: (id: string) => (teachers.has(id) ? teacherName(teachers.get(id)!) : id),
    step: (key: string) => t(`admin.eduDashboard.funnel.${key}`, FUNNEL_LABEL_FALLBACK[key] ?? key),
  };
  const render = (f: Finding) => sentence(f, t, ctx);
  const by = (tone: FindingTone) => data.findings.filter((f) => f.tone === tone);
  const facts = by('fact');

  return (
    <div className="space-y-3" data-testid="edu-findings">
      <Column
        testId="findings-early"
        title={t('admin.eduDashboard.finding.earlyTitle', 'Early warnings: likely to become problems')}
        empty={t('admin.eduDashboard.finding.earlyNone', 'No early warning signs. Nothing is slipping yet.')}
        items={by('early')}
        render={render}
        onDrill={onDrill}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Column
          testId="findings-working"
          title={t('admin.eduDashboard.finding.workingTitle', 'What is working')}
          empty={t('admin.eduDashboard.finding.workingNone', 'No clear win yet. Nothing is trending up enough to call.')}
          items={by('win')}
          render={render}
          onDrill={onDrill}
        />
        <Column
          testId="findings-broken"
          title={t('admin.eduDashboard.finding.brokenTitle', 'What is not working')}
          empty={t('admin.eduDashboard.finding.brokenNone', 'Nothing is breaking right now.')}
          items={by('problem')}
          render={render}
          onDrill={onDrill}
        />
      </div>
      {facts.length > 0 && (
        <ul data-testid="findings-facts" className="flex flex-wrap gap-2">
          {facts.map((f) => (
            <li key={f.id} className={`flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs text-neo-cream ${TONE.fact.ring}`}>
              <Sparkles className={`h-3.5 w-3.5 ${TONE.fact.text}`} aria-hidden="true" />
              {render(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
