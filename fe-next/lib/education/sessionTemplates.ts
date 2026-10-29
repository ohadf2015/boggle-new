import type { Language } from '@/lib/supabase/education/types';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import { configuredRoundMinutes } from '@/lib/education/gameModes';
import type { GradeBand } from '@/lib/education/library';
import { teacherHostHref, type HOST_TIMER_MINUTES } from '@/lib/education/teacherHostHref';
import type { EduMascotPose } from '@/lib/education/mascotArt';
import { ESL_PACK_THEMES, packThemesFor, seasonThemeFor, type PackTheme } from '@/lib/education/themedPacks';

export type SessionId =
  | 'warm-up'
  | 'exit-ticket'
  | 'brain-break'
  | 'icebreaker'
  | 'spelling-bee'
  | 'test-review'
  | 'esl-starter'
  | 'early-finishers';

/** `season` resolves to whichever seasonal pack fits today's date. */
export type SessionPackRef = PackTheme | 'season';

export interface SessionTemplate {
  id: SessionId;
  nameKey: string;
  whenKey: string;
  mode: ClassroomCatalogueId;
  timerMinutes: (typeof HOST_TIMER_MINUTES)[number];
  rounds: number;
  quiz?: { questionCount: number; seconds: number };
  preset?: ClassroomPresetId;
  gradeBands: readonly GradeBand[];
  /** Ordered: the first one that exists for the board language is the default; empty = plays without a list. */
  packs: readonly SessionPackRef[];
  mascot?: EduMascotPose;
}

const ALL_BANDS: readonly GradeBand[] = ['k2', 'g35', 'g68', 'g912'];

const keys = (camel: string) => ({
  nameKey: `education.starterPacks.session.${camel}.name`,
  whenKey: `education.starterPacks.session.${camel}.when`,
});

export const SESSION_TEMPLATES: readonly SessionTemplate[] = [
  { id: 'warm-up', mascot: 'warmup', ...keys('warmUp'), mode: 'classic', timerMinutes: 5, rounds: 1, gradeBands: ALL_BANDS, packs: ['season'] },
  {
    id: 'exit-ticket',
    mascot: 'exitTicket',
    ...keys('exitTicket'),
    mode: 'vocab-quiz',
    timerMinutes: 3,
    rounds: 1,
    quiz: { questionCount: 8, seconds: 20 },
    gradeBands: ALL_BANDS,
    packs: ['season'],
  },
  { id: 'brain-break', mascot: 'brainBreak', ...keys('brainBreak'), mode: 'blast', timerMinutes: 3, rounds: 1, gradeBands: ALL_BANDS, packs: [] },
  { id: 'icebreaker', mascot: 'icebreaker', ...keys('icebreaker'), mode: 'word-hunt', timerMinutes: 5, rounds: 1, gradeBands: ALL_BANDS, packs: ['class'] },
  {
    id: 'spelling-bee',
    mascot: 'spellingBee',
    ...keys('spellingBee'),
    mode: 'word-hunt',
    timerMinutes: 3,
    rounds: 2,
    preset: 'friday-battle',
    gradeBands: ['k2', 'g35'],
    packs: ['phonics', 'k2read'],
  },
  {
    id: 'test-review',
    mascot: 'reviewTest',
    ...keys('testReview'),
    mode: 'vocab-quiz',
    timerMinutes: 3,
    rounds: 2,
    quiz: { questionCount: 10, seconds: 20 },
    gradeBands: ['g35', 'g68', 'g912'],
    packs: ['math', 'lashon'],
  },
  {
    id: 'esl-starter',
    mascot: 'esl',
    ...keys('eslStarter'),
    mode: 'vocab-quiz',
    timerMinutes: 3,
    rounds: 1,
    quiz: { questionCount: 8, seconds: 20 },
    gradeBands: ['g35', 'g68', 'g912'],
    packs: ESL_PACK_THEMES,
  },
  { id: 'early-finishers', mascot: 'earlyFinisher', ...keys('earlyFinishers'), mode: 'wordcraft', timerMinutes: 5, rounds: 1, gradeBands: ALL_BANDS, packs: ['spooky'] },
];

export function sessionPackThemes(session: SessionTemplate, language: Language, now: Date = new Date()): PackTheme[] {
  const available = new Set(packThemesFor(language));
  const resolved = session.packs.map((ref) => (ref === 'season' ? seasonThemeFor(now) : ref));
  return [...new Set(resolved)].filter((theme) => available.has(theme));
}

export function sessionsFor(language: Language, now: Date = new Date()): SessionTemplate[] {
  return SESSION_TEMPLATES.filter((s) => s.packs.length === 0 || sessionPackThemes(s, language, now).length > 0);
}

/** Derived from the lobby's own round math so the card can never promise a length the room will not run. */
export function sessionMinutes(session: SessionTemplate): number {
  const perRound = configuredRoundMinutes(launchOf(session.mode).gameMode, {
    timerMinutes: session.timerMinutes,
    vocabQuizQuestionCount: session.quiz?.questionCount,
    vocabQuizSeconds: session.quiz?.seconds,
  });
  return perRound * session.rounds;
}

export function sessionHostHref(locale: string, session: SessionTemplate, packCode: string | null, classroomId?: string): string {
  const base = teacherHostHref(locale, { classroomId, mode: session.mode, minutes: session.timerMinutes });
  const params = new URLSearchParams(base.split('?')[1] ?? '');
  params.set('session', session.id);
  if (packCode) params.set('pack', packCode);
  if (session.preset) params.set('preset', session.preset);
  if (session.quiz) {
    params.set('questions', String(session.quiz.questionCount));
    params.set('seconds', String(session.quiz.seconds));
  }
  return `${base.split('?')[0]}?${params.toString()}`;
}
