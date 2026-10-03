import { describe, it, expect } from 'vitest';
import { SCHOOL_PRICING, estimateSchoolAnnualUsd, schoolPriceParams } from '../schoolPricing';
import { upgradeFaqParams } from '../upgradeFaq';

describe('schoolPricing', () => {
  it('holds the owner-approved indicative numbers in one place', () => {
    expect(SCHOOL_PRICING).toEqual({ perTeacherYearUsd: 49, minTeachers: 5 });
  });

  it('estimates teachers x per-teacher price', () => {
    expect(estimateSchoolAnnualUsd(5)).toBe(5 * SCHOOL_PRICING.perTeacherYearUsd);
    expect(estimateSchoolAnnualUsd(12)).toBe(588);
  });

  it('gives no estimate below the minimum or for junk input', () => {
    expect(estimateSchoolAnnualUsd(SCHOOL_PRICING.minTeachers - 1)).toBeNull();
    expect(estimateSchoolAnnualUsd(Number.NaN)).toBeNull();
    expect(estimateSchoolAnnualUsd(0)).toBeNull();
  });

  it('clamps absurd counts to the quote form maximum', () => {
    expect(estimateSchoolAnnualUsd(100000)).toBe(500 * SCHOOL_PRICING.perTeacherYearUsd);
  });

  it('derives copy params and FAQ params from the constant', () => {
    expect(schoolPriceParams()).toEqual({ price: '$49', min: 5 });
    expect(upgradeFaqParams()).toMatchObject({ schoolPrice: '$49', schoolMin: 5 });
  });
});
