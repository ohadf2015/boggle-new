import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../PageClient.tsx'), 'utf8');

describe('upgrade page at 390px', () => {
  it('only pins the legal footer from lg up, so it no longer eats a quarter of a phone screen', () => {
    const footer = src.match(/data-testid="upgrade-footer"\s*\n\s*className="([^"]+)"/);
    expect(footer).not.toBeNull();
    expect(footer![1]).toContain('hidden lg:block');
  });

  it('keeps the consent line beside the buy buttons on mobile, in the scroll flow', () => {
    const cards = src.indexOf('<UpgradePlanCards');
    expect(cards).toBeGreaterThan(-1);
    const inline = src.indexOf('data-testid="upgrade-legal-inline"');
    expect(inline).toBeGreaterThan(cards);
    expect(src).toMatch(/data-testid="upgrade-legal-inline"[\s\S]{0,80}lg:hidden/);
  });
});

describe('upgrade page compares only enforced features', () => {
  it('shows the aligned Free vs Pro matrix', () => {
    expect(src).toContain('<PlanComparisonMatrix');
  });

  it('crosses the new Pro features in the Free column instead of hiding them', () => {
    const free = src.match(/const freeFeatures = \[([\s\S]*?)\n  \];/)![1];
    expect(free).toMatch(/eduPro\.upgrade\.freeMastery'\)[\s\S]*?included: false/);
    expect(free).toMatch(/eduPro\.upgrade\.freePractice'\)[\s\S]*?included: false/);
  });
});
