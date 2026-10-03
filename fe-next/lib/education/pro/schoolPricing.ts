import { clampTeachers } from '@/lib/education/pro/schoolQuote';

export const SCHOOL_PRICING = { perTeacherYearUsd: 49, minTeachers: 5 } as const;

export function schoolPriceLabel(): string {
  return `$${SCHOOL_PRICING.perTeacherYearUsd}`;
}

export function schoolPriceParams(): { price: string; min: number } {
  return { price: schoolPriceLabel(), min: SCHOOL_PRICING.minTeachers };
}

export function estimateSchoolAnnualUsd(teachers: number): number | null {
  if (!Number.isFinite(teachers) || teachers < SCHOOL_PRICING.minTeachers) return null;
  return clampTeachers(teachers) * SCHOOL_PRICING.perTeacherYearUsd;
}
