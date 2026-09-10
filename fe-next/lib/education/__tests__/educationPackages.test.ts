import { describe, it, expect } from 'vitest';
import {
  EDUCATION_PACKAGES,
  CLASSROOM_PLAN_PRICE_USD,
  TEACHER_PRO_PRICE_USD,
  packageById,
} from '../educationPackages';

describe('EDUCATION_PACKAGES', () => {
  it('anchors Teacher Pro at $9/mo with a checkout CTA (existing Polar path)', () => {
    const pro = packageById('teacher_pro');
    expect(pro.priceUsd).toBe(TEACHER_PRO_PRICE_USD);
    expect(pro.priceUsd).toBe(9);
    expect(pro.interval).toBe('month');
    expect(pro.cta).toBe('checkout');
    expect(pro.checkoutPath).toBe('/teacher/upgrade');
  });

  it('anchors Classroom at $39/term with a lead form, never checkout', () => {
    const classroom = packageById('classroom');
    expect(classroom.priceUsd).toBe(CLASSROOM_PLAN_PRICE_USD);
    expect(classroom.priceUsd).toBe(39);
    expect(classroom.interval).toBe('term');
    expect(classroom.cta).toBe('lead');
    expect(classroom.leadPlan).toBe('classroom');
    expect(classroom.checkoutPath).toBeUndefined();
  });

  it('offers Schools & districts as contact-us lead tagged school, no price, no checkout', () => {
    const school = packageById('school');
    expect(school.priceUsd).toBeNull();
    expect(school.cta).toBe('lead');
    expect(school.leadPlan).toBe('school');
    expect(school.checkoutPath).toBeUndefined();
  });

  it('is exactly the three public packages — no extra SKU, no billing product', () => {
    expect(EDUCATION_PACKAGES.map((p) => p.id)).toEqual(['teacher_pro', 'classroom', 'school']);
    expect(EDUCATION_PACKAGES.some((p) => p.cta === 'checkout' && p.id !== 'teacher_pro')).toBe(false);
  });
});
