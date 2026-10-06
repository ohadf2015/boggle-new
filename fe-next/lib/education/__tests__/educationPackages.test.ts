import { describe, it, expect } from 'vitest';
import {
  EDUCATION_PACKAGES,
  SCHOOL_PLAN_PRICE_USD,
  SCHOOL_PLAN_MIN_TEACHERS,
  TEACHER_PRO_PRICE_USD,
  packageById,
} from '../educationPackages';
import { SCHOOL_PRICING } from '../pro/schoolPricing';

describe('EDUCATION_PACKAGES', () => {
  it('anchors Teacher Pro at $9/mo with a checkout CTA (existing Polar path)', () => {
    const pro = packageById('teacher_pro');
    expect(pro.priceUsd).toBe(TEACHER_PRO_PRICE_USD);
    expect(pro.priceUsd).toBe(9);
    expect(pro.interval).toBe('month');
    expect(pro.cta).toBe('checkout');
    expect(pro.checkoutPath).toBe('/teacher/upgrade');
  });

  it('anchors Schools & departments at $49/teacher/year with a lead form, never checkout', () => {
    const school = packageById('school');
    expect(school.priceUsd).toBe(SCHOOL_PLAN_PRICE_USD);
    expect(school.priceUsd).toBe(SCHOOL_PRICING.perTeacherYearUsd);
    expect(school.priceUsd).toBe(49);
    expect(school.interval).toBe('year');
    expect(school.cta).toBe('lead');
    expect(school.leadPlan).toBe('school');
    expect(school.checkoutPath).toBeUndefined();
    expect(SCHOOL_PLAN_MIN_TEACHERS).toBe(5);
  });

  it('is exactly the two public packages — no Classroom $39/term SKU', () => {
    expect(EDUCATION_PACKAGES.map((p) => p.id)).toEqual(['teacher_pro', 'school']);
    expect(EDUCATION_PACKAGES.some((p) => p.cta === 'checkout' && p.id !== 'teacher_pro')).toBe(false);
    expect(EDUCATION_PACKAGES.some((p) => (p as { id: string }).id === 'classroom')).toBe(false);
  });
});
