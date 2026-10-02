/**
 * Compact one-screen layout for the upgrade page (2026-09-18).
 *
 * QA found that at 1920x1080 the page's inner scroll region (`education-shell-scroll`)
 * overflowed its viewport by ~295px — the pricing cards were cut off mid-page and a
 * teacher had to scroll to see the Pro CTA. `document.documentElement.scrollHeight` alone
 * cannot catch this: EducationShell locks `<body>` (`.edu-shell-locked`), so the DOCUMENT
 * never scrolls even when the page is broken — the overflow moves to the shell's inner
 * `education-shell-scroll` region instead. Real-browser measurement (agent-browser at
 * 1920x1080) confirmed the fix: clientHeight === scrollHeight (0px overflow) after these
 * changes. jsdom cannot reproduce that measurement (no real layout), so this test instead
 * pins the structural levers that made the fit possible, the same convention
 * `scrollFix.test.ts` already uses for this file.
 *
 * These are regression guards, not the verification itself — the verification is the
 * real-browser screenshot + scrollHeight/clientHeight measurement recorded for this round.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const pagePath = join(__dirname, '../PageClient.tsx');
const pageSource = readFileSync(pagePath, 'utf8');
const cardsPath = join(__dirname, '../../../../../components/teacher/pro/UpgradePlanCards.tsx');
const cardsSource = readFileSync(cardsPath, 'utf8');

describe('Upgrade page — compact one-screen layout', () => {
  it('gives the pricing cards compact padding, not the original oversized p-7 sm:p-8', () => {
    expect(cardsSource).not.toContain('p-7 sm:p-8');
    expect(cardsSource).toMatch(/p-4 [^"]*sm:p-5/);
  });

  it('sends schools to a quote form, never to a second checkout button', () => {
    const plansSource = readFileSync(
      join(__dirname, '../../../../../components/teacher/pro/UpgradePlanCards.tsx'),
      'utf8',
    );
    expect(plansSource).toContain('onClick={onSchool} data-testid="plan-school-cta"');
    expect(plansSource).not.toContain('/api/subscription/checkout');
    expect(pageSource).toMatch(/onSchool=\{openSchool\}/);
    expect(pageSource).toMatch(/setTab\('school'\)/);
  });

  it('keeps the legal footer compact so it does not crowd out the CTA on mobile', () => {
    expect(pageSource).not.toContain('pt-6 pb-4 px-4 text-center');
    expect(pageSource).toContain('pt-3 pb-3 px-4 text-center');
  });

  it('still renders the honest, aligned free-tier feature list (unchanged by the layout pass)', () => {
    const freeMatch = pageSource.match(/const freeFeatures = \[([\s\S]*?)\];/);
    expect(freeMatch).not.toBeNull();
    if (freeMatch) {
      expect(freeMatch[0]).toContain('teacher.subscription.unlimitedClasses');
      expect(freeMatch[0]).toContain('teacher.subscription.unlimitedStudents');
      expect(freeMatch[0]).toContain('education.landing.pro.analytics');
    }
  });
});
