'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Finding } from '@/lib/admin/findings';
import { FindingsPanel } from '../shared/FindingsPanel';
import {
  FUNNEL_LABEL_FALLBACK,
  teacherName,
  useTeacherIndex,
  weekdayLabels,
  type ActiveDrill,
  type EduDashboardView,
  type Translate,
} from './eduDashboardShared';

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

export function EduFindings({ data, onDrill }: { data: EduDashboardView; onDrill: (d: ActiveDrill) => void }) {
  const { t, language } = useLanguage();
  const teachers = useTeacherIndex(data.teachers);
  const weekdays = useMemo(() => weekdayLabels(language, 'long'), [language]);
  const ctx = {
    weekday: (i: number) => weekdays[i],
    nameOf: (id: string) => (teachers.has(id) ? teacherName(teachers.get(id)!) : id),
    step: (key: string) => t(`admin.eduDashboard.funnel.${key}`, FUNNEL_LABEL_FALLBACK[key] ?? key),
  };
  return <FindingsPanel testId="edu-findings" findings={data.findings} describe={(f) => sentence(f, t, ctx)} onDrill={onDrill} />;
}
