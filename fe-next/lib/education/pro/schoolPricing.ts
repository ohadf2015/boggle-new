import { clampTeachers } from '@/lib/education/pro/schoolQuote';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

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

/** The school price as a monthly figure per teacher, and how much less it is than monthly Teacher Pro. */
export function schoolMonthlyParams(monthlyProUsd: number = TEACHER_PRO_PRICE_USD): { monthly: string; save: number } {
  const perMonth = SCHOOL_PRICING.perTeacherYearUsd / 12;
  return {
    monthly: `$${perMonth.toFixed(2)}`,
    save: Math.floor((1 - SCHOOL_PRICING.perTeacherYearUsd / (monthlyProUsd * 12)) * 100),
  };
}
