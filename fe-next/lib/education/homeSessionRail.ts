import type { Language } from '@/lib/supabase/education/types';
import { isGradeBand, type GradeBand } from '@/lib/education/library';
import type { EduMascotPose } from '@/lib/education/mascotArt';
import { isPackLanguage, seasonThemeFor, themedPackCode, type PackTheme } from '@/lib/education/themedPacks';
import {
  sessionHostHref,
  sessionMinutes,
  sessionPackThemes,
  sessionsFor,
  type SessionId,
  type SessionTemplate,
} from '@/lib/education/sessionTemplates';

export interface RailSession {
  session: SessionTemplate;
  theme: PackTheme | null;
  packCode: string | null;
  minutes: number;
}

export interface HomeSessionRailInput {
  language: Language;
  gradeBand: GradeBand | null;
  nowMs: number;
  lastPlayedMs: number | null;
  limit?: number;
}

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

function rank(s: SessionTemplate, input: HomeSessionRailInput, lead: SessionId, now: Date): number {
  if (s.id === lead) return 0;
  if (s.packs.includes('season')) return 1;
  if (input.gradeBand && s.gradeBands.length < 4) return 2;
  if (s.packs.includes('spooky') && now.getMonth() === 9) return 3;
  return 4;
}

export function homeSessionRail(input: HomeSessionRailInput): RailSession[] {
  const { language, gradeBand, nowMs, lastPlayedMs, limit = 6 } = input;
  const now = new Date(nowMs);
  const lead: SessionId = lastPlayedMs !== null && sameDay(lastPlayedMs, nowMs) ? 'exit-ticket' : 'warm-up';
  return sessionsFor(language, now)
    .filter((s) => !gradeBand || s.gradeBands.includes(gradeBand))
    .map((s, i) => ({ s, i, r: rank(s, input, lead, now) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, Math.max(0, limit))
    .map(({ s }) => {
      const theme = sessionPackThemes(s, language, now)[0] ?? null;
      return { session: s, theme, packCode: theme ? themedPackCode(language, theme) : null, minutes: sessionMinutes(s) };
    });
}

export function railRunHref(locale: string, item: RailSession, classroomId: string | undefined): string {
  return sessionHostHref(locale, item.session, item.packCode, classroomId);
}

export interface RailLesson {
  classroom_id: string | null;
  language: Language;
  grade_band?: string | null;
}

export function classLessonProfile(lessons: readonly RailLesson[], classroomId: string): { gradeBand: GradeBand | null; languages: Language[] } {
  const mine = lessons.filter((l) => l.classroom_id === classroomId);
  const counts = new Map<GradeBand, number>();
  for (const l of mine) if (isGradeBand(l.grade_band)) counts.set(l.grade_band, (counts.get(l.grade_band) ?? 0) + 1);
  let gradeBand: GradeBand | null = null;
  for (const [band, n] of counts) if (!gradeBand || n > (counts.get(gradeBand) ?? 0)) gradeBand = band;
  return { gradeBand, languages: [...new Set(mine.map((l) => l.language))] };
}

export function railLanguages(classLanguage: Language, lessonLanguages: readonly Language[]): Language[] {
  return [...new Set([classLanguage, ...lessonLanguages])].filter((l) => isPackLanguage(l));
}

/** `everPlayed` covers classes whose last game fell outside the activity window. */
export function homeCoachCue({ nowMs, lastPlayedMs, everPlayed = false, rail }: { nowMs: number; lastPlayedMs: number | null; everPlayed?: boolean; rail: readonly RailSession[] }): { key: string; session: RailSession } | null {
  const session = rail[0];
  if (!session) return null;
  if (lastPlayedMs === null && !everPlayed) return { key: 'eduShell.home.cue.first', session };
  if (lastPlayedMs !== null && sameDay(lastPlayedMs, nowMs)) return { key: 'eduShell.home.cue.closeOut', session };
  return { key: `eduShell.home.cue.season.${seasonThemeFor(new Date(nowMs))}`, session };
}

export function weekMascotPose(summary: { gamesPlayed: number; lastPlayedAt: Record<string, string> } | null): EduMascotPose {
  if (!summary) return 'empty';
  if (summary.gamesPlayed > 0) return 'success';
  return Object.keys(summary.lastPlayedAt).length > 0 ? 'tip' : 'empty';
}
