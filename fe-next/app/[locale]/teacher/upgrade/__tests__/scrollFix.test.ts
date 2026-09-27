/**
 * Verify that the upgrade page no longer uses min-h-screen and instead uses EducationShell.
 * This test ensures the scrolling fix for 1920x1080 displays is in place.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('UpgradePricingPageClient scroll fix', () => {
  const pagePath = join(__dirname, '../PageClient.tsx');
  const pageSource = readFileSync(pagePath, 'utf8');

  it('imports EducationShell', () => {
    expect(pageSource).toContain("import { EducationShell } from '@/components/education/shell/EducationShell'");
  });

  it('uses EducationShell as the root component', () => {
    expect(pageSource).toContain('<EducationShell');
    expect(pageSource).toContain('</EducationShell>');
  });

  it('does not use min-h-screen on the root element (old pattern)', () => {
    // The old root div used min-h-screen. With EducationShell, we should not have that pattern.
    // (EducationShell manages the height internally)
    const hasOldMinHeightScreen = pageSource.includes("className={cn('flex flex-col min-h-screen bg-neo-navy'");
    expect(hasOldMinHeightScreen).toBe(false);
  });

  it('marks footer as shrink-0', () => {
    // Footer should be marked shrink-0 to ensure it doesn't grow and push content
    expect(pageSource).toContain("shrink-0");
    expect(pageSource).toContain('data-testid="upgrade-footer"');
  });

  it('has a two-column hero layout for desktop', () => {
    // The hero section should use grid layout responsive columns
    expect(pageSource).toContain('grid-cols-1 lg:grid-cols-2');
    expect(pageSource).toContain('data-testid="upgrade-hero-section"');
  });

  it('keeps FAQ in a collapsed details element', () => {
    expect(pageSource).toContain('<details');
    expect(pageSource).toContain('teacher.subscription.faqTitle');
  });

  it('has trust chips rendered with test IDs', () => {
    expect(pageSource).toContain('data-testid="trust-chip"');
  });
});
