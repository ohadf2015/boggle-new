/**
 * SSR money-path guard: /education must ship a Teacher Pro checkout href in
 * HTML unconditionally, ahead of the marketing block that swaps out once
 * auth resolves to a teacher (EducationHero / ProFraming render immediately
 * too now, but this CTA must not depend on that gate at all).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

const ROOT = join(__dirname, '..', '..', '..', '..');
const PAGE_CLIENT = join(ROOT, 'app', '[locale]', 'education', 'PageClient.tsx');
const CTA = join(ROOT, 'components', 'education', 'TeacherProCheckoutCta.tsx');
const HERO = join(ROOT, 'components', 'education', 'EducationHero.tsx');
const PRO = join(ROOT, 'components', 'education', 'ProFramingSection.tsx');

describe('Teacher Pro checkout CTAs on education surfaces', () => {
  it('hub PageClient mounts TeacherProCheckoutCta outside the auth loading gate', () => {
    const src = readFileSync(PAGE_CLIENT, 'utf8');
    expect(src).toMatch(/<TeacherProCheckoutCta\b/);
    expect(src).toMatch(/from '@\/components\/education\/TeacherProCheckoutCta'/);
    // The module root is /education. A "back one level" control resolves to the
    // consumer homepage and dumps a teacher out of the classroom product.
    expect(src).not.toContain('TopBackLink');
    // Host and join come first. The checkout card stays in the document for
    // every visitor, after that decision, and outside both auth branches.
    const ctaIdx = src.indexOf('<TeacherProCheckoutCta');
    const heroIdx = src.indexOf('<EducationHero');
    const joinIdx = src.indexOf('student-card-join-link');
    expect(heroIdx).toBeGreaterThan(-1);
    expect(joinIdx).toBeGreaterThan(-1);
    expect(ctaIdx).toBeGreaterThan(heroIdx);
    expect(ctaIdx).toBeGreaterThan(joinIdx);
  });

  it('shared CTA module targets teacher/upgrade and uses TEACHER_PRO_PRICE_USD', () => {
    const src = readFileSync(CTA, 'utf8');
    expect(src).toContain("'/teacher/upgrade'");
    expect(src).toContain('TEACHER_PRO_PRICE_USD');
    expect(src).toContain(`$${TEACHER_PRO_PRICE_USD}`);
  });

  it('EducationHero primary CTA points at teacher/upgrade', () => {
    const src = readFileSync(HERO, 'utf8');
    expect(src).toContain('TEACHER_PRO_CHECKOUT_PATH');
    expect(src).toContain('education-hero-pro-cta');
    expect(src).toContain('education-hero-free-cta');
  });

  it('ProFramingSection checkout link uses teacher/upgrade not only /pricing', () => {
    const src = readFileSync(PRO, 'utf8');
    expect(src).toContain('/teacher/upgrade');
    expect(src).not.toMatch(/href=\{`\/\$\{language\}\/pricing`\}/);
  });
});
