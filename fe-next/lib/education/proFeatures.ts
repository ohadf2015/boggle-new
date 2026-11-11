import { FREE_TIER_LIMITS, PRO_LIMITS, TEACHER_PRO_PRICE_USD } from './freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from './pro/trialDays';
import { SCHOOL_PRICING } from './pro/schoolPricing';
import { catalogueModes } from '@/components/education/ClassroomModeCatalogueData';
import { locales } from '@/lib/i18n';

/**
 * What Free and Teacher Pro each include, for every public surface that describes the plans
 * (landing Pro card, compare-page strip, FAQ, for-schools copy). Server-safe: no hooks.
 *
 * Must equal `PRO_FEATURES` in components/teacher/ProGate.tsx; a client module cannot be
 * imported from server copy, so the parity lives in `__tests__/proFeatures.test.ts`.
 */
export const ENFORCED_PRO_FEATURES = ['analytics', 'reports', 'pressureDials', 'mastery', 'missedPractice'] as const;
export type EnforcedProFeature = (typeof ENFORCED_PRO_FEATURES)[number];

export const CLASSROOM_MODE_COUNT = catalogueModes().length;
export const LANGUAGE_COUNT = locales.length;

/** `number` = a cap, `null` = unlimited, `boolean` = has it or not. */
export type PlanCell = number | null | boolean;

export interface PlanTableRow {
  id: string;
  labelKey: string;
  /** An existing localized key to show until `labelKey` lands in every locale. */
  fallbackKey?: string;
  fallback: string;
  free: PlanCell;
  pro: PlanCell;
  gate?: EnforcedProFeature;
}

/** Named limits first (what a growing teacher hits), shared ticks, then what $ buys. */
export const PLAN_TABLE_ROWS: readonly PlanTableRow[] = [
  { id: 'classes', labelKey: 'teacher.subscription.matrix.classes', fallback: 'Classrooms', free: FREE_TIER_LIMITS.classes, pro: PRO_LIMITS.classes },
  { id: 'students', labelKey: 'teacher.subscription.matrix.studentsPerClass', fallback: 'Students on each class roster', free: FREE_TIER_LIMITS.studentsPerClass, pro: PRO_LIMITS.studentsPerLiveGame },
  { id: 'assignments', labelKey: 'eduPro.table.assignments', fallbackKey: 'teacher.dashboard.assignments', fallback: 'Assignments per class', free: FREE_TIER_LIMITS.assignmentsPerClass, pro: PRO_LIMITS.assignmentsPerClass },
  { id: 'modes', labelKey: 'eduPro.table.modes', fallbackKey: 'landing.home.gameModes', fallback: 'Live game modes', free: CLASSROOM_MODE_COUNT, pro: CLASSROOM_MODE_COUNT },
  { id: 'customLists', labelKey: 'teacher.subscription.matrix.customLists', fallback: 'Your own word lists', free: true, pro: true },
  { id: 'noAds', labelKey: 'teacher.subscription.matrix.noAds', fallback: 'Ad-free for students', free: true, pro: true },
  { id: 'analytics', labelKey: 'education.landing.pro.analytics', fallback: 'Per-student progress analytics', free: false, pro: true, gate: 'analytics' },
  { id: 'reports', labelKey: 'eg6Land.pro.reports', fallback: 'Printable class reports', free: false, pro: true, gate: 'reports' },
  { id: 'mastery', labelKey: 'eg6Land.pro.mastery', fallback: 'Mastery heatmap: which words each student knows', free: false, pro: true, gate: 'mastery' },
  { id: 'missedPractice', labelKey: 'eg6Land.pro.missedPractice', fallback: 'Missed-practice rounds built from real gaps', free: false, pro: true, gate: 'missedPractice' },
  { id: 'pressureDials', labelKey: 'teacher.proGate.pressureDials.title', fallback: 'Calm mode for anxious students', free: false, pro: true, gate: 'pressureDials' },
];

export const PRO_COPY_PARAMS = {
  price: `$${TEACHER_PRO_PRICE_USD}`,
  days: TEACHER_PRO_TRIAL_DAYS,
  classes: FREE_TIER_LIMITS.classes,
  students: FREE_TIER_LIMITS.studentsPerClass,
  assignments: FREE_TIER_LIMITS.assignmentsPerClass,
  modes: CLASSROOM_MODE_COUNT,
  languages: LANGUAGE_COUNT,
  schoolPrice: `$${SCHOOL_PRICING.perTeacherYearUsd}`,
  schoolMin: SCHOOL_PRICING.minTeachers,
} as const;

/** Replaces `{price}`, `{classes}`… with the live constants; unknown placeholders stay as typed. */
export function fillProCopy(text: string, params: Record<string, string | number> = PRO_COPY_PARAMS): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
