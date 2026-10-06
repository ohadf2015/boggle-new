/**
 * Public education packages. Teacher Pro is the only SKU with live billing.
 * Schools & departments ($49 per teacher / year, 5+ teachers, invoice/PO via
 * "Get a school quote") is the single school offer — same numbers as
 * /teacher/upgrade and lib/education/pro/schoolPricing.ts.
 */
import { SCHOOL_PRICING } from '@/lib/education/pro/schoolPricing';
import { TEACHER_PRO_PRICE_USD as PRO_PRICE } from '@/lib/education/freeTierLimits';

export const TEACHER_PRO_PRICE_USD = PRO_PRICE;
export const SCHOOL_PLAN_PRICE_USD = SCHOOL_PRICING.perTeacherYearUsd;
export const SCHOOL_PLAN_MIN_TEACHERS = SCHOOL_PRICING.minTeachers;

export type EducationPackageId = 'teacher_pro' | 'school';
/** Lead form always tags the school tier (classroom $39/term plan retired 2026-10-06). */
export type EducationLeadPlan = 'school';
export type EducationPackageCta = 'checkout' | 'lead';

export const SCHOOL_LEAD_SOURCES = [
  'for-schools-page',
  'classroom-plan', // historical; new submits use for-schools-page / school-district / teacher-upgrade
  'school-district',
  'teacher-upgrade',
] as const;
export type SchoolLeadSource = (typeof SCHOOL_LEAD_SOURCES)[number];

export interface EducationPackage {
  id: EducationPackageId;
  priceUsd: number | null;
  interval: 'month' | 'year' | null;
  cta: EducationPackageCta;
  leadPlan?: EducationLeadPlan;
  checkoutPath?: '/teacher/upgrade';
  leadSource: SchoolLeadSource;
}

export const EDUCATION_PACKAGES: readonly EducationPackage[] = [
  {
    id: 'teacher_pro',
    priceUsd: TEACHER_PRO_PRICE_USD,
    interval: 'month',
    cta: 'checkout',
    checkoutPath: '/teacher/upgrade',
    leadSource: 'for-schools-page',
  },
  {
    id: 'school',
    priceUsd: SCHOOL_PLAN_PRICE_USD,
    interval: 'year',
    cta: 'lead',
    leadPlan: 'school',
    leadSource: 'for-schools-page',
  },
] as const;

export function packageById(id: EducationPackageId): EducationPackage {
  const found = EDUCATION_PACKAGES.find((p) => p.id === id);
  if (!found) throw new Error(`unknown education package: ${id}`);
  return found;
}
