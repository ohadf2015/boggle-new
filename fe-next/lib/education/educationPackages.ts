/**
 * Public education packages. Teacher Pro is the only SKU with live billing.
 * Classroom ($39/term) and Schools (contact) are price anchors + lead capture
 * until ≥30 active classrooms or ≥10 qualified school leads.
 */

export const TEACHER_PRO_PRICE_USD = 9;
export const CLASSROOM_PLAN_PRICE_USD = 39;

export type EducationPackageId = 'teacher_pro' | 'classroom' | 'school';
export type EducationLeadPlan = 'classroom' | 'school';
export type EducationPackageCta = 'checkout' | 'lead';

export interface EducationPackage {
  id: EducationPackageId;
  priceUsd: number | null;
  interval: 'month' | 'term' | null;
  cta: EducationPackageCta;
  leadPlan?: EducationLeadPlan;
  checkoutPath?: '/teacher/upgrade';
  leadSource: string;
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
    id: 'classroom',
    priceUsd: CLASSROOM_PLAN_PRICE_USD,
    interval: 'term',
    cta: 'lead',
    leadPlan: 'classroom',
    leadSource: 'classroom-plan',
  },
  {
    id: 'school',
    priceUsd: null,
    interval: null,
    cta: 'lead',
    leadPlan: 'school',
    leadSource: 'school-district',
  },
] as const;

export function packageById(id: EducationPackageId): EducationPackage {
  const found = EDUCATION_PACKAGES.find((p) => p.id === id);
  if (!found) throw new Error(`unknown education package: ${id}`);
  return found;
}

export const SCHOOL_LEAD_SOURCES = [
  'for-schools-page',
  'classroom-plan',
  'school-district',
] as const;
export type SchoolLeadSource = (typeof SCHOOL_LEAD_SOURCES)[number];
