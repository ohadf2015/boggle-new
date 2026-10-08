/**
 * SSR money-path guard: public /teacher must ship a Teacher Pro checkout
 * href + $9 price in the route module, outside TeacherGate's loader.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

const ROOT = join(__dirname, '..', '..', '..', '..');
const PAGE = join(ROOT, 'app', '[locale]', 'teacher', 'page.tsx');
const CTA_WRAP = join(ROOT, 'app', '[locale]', 'teacher', 'PublicTeacherPayCta.tsx');
const CTA = join(ROOT, 'components', 'education', 'TeacherProCheckoutCta.tsx');
const GATE = join(ROOT, 'components', 'education', 'TeacherGate.tsx');

describe('public /teacher Teacher Pro CTA', () => {
  it('server page mounts PublicTeacherPayCta after the HQ client (its unmount must not shift the gate), not inside TeacherGate', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).not.toMatch(/^['"]use client['"]/m);
    expect(src).toMatch(/<PublicTeacherPayCta\b/);
    expect(src).toMatch(/from '\.\/PublicTeacherPayCta'/);
    expect(src).toMatch(/<TeacherPageClient/);
    expect(src).not.toMatch(/TeacherGate/);
    const ctaIdx = src.indexOf('<PublicTeacherPayCta');
    const hqIdx = src.indexOf('<TeacherPageClient');
    expect(hqIdx).toBeGreaterThan(-1);
    expect(ctaIdx).toBeGreaterThan(hqIdx);
  });

  it('wrapper SSRs TeacherProCheckoutCta and hides only after a teacher profile resolves', () => {
    const src = readFileSync(CTA_WRAP, 'utf8');
    expect(src).toMatch(/<TeacherProCheckoutCta\b/);
    expect(src).toContain('isTeacherProfile');
    expect(src).toContain('public-teacher-pay-cta');
    expect(src).not.toMatch(/<TeacherGate\b/)
  });

  it('shared CTA still targets teacher/upgrade at TEACHER_PRO_PRICE_USD', () => {
    const src = readFileSync(CTA, 'utf8');
    expect(src).toContain("'/teacher/upgrade'");
    expect(src).toContain(`$${TEACHER_PRO_PRICE_USD}`);
    expect(TEACHER_PRO_PRICE_USD).toBe(9);
  });

  it('does not edit TeacherGate (unsigned HQ redirect stays; this card is the public CTA only)', () => {
    const src = readFileSync(GATE, 'utf8');
    expect(src).toContain('education/access');
  });
});
