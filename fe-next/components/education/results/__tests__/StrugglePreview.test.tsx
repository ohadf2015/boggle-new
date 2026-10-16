import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const pro = vi.hoisted(() => ({ hasPro: false, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { StrugglePreview } from '../StrugglePreview';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const mastery = {
  Noa: { found: 6, total: 10 },
  Ido: { found: 1, total: 10 },
  Maya: { found: 3, total: 10 },
  'Ms Cohen': { found: 0, total: 10 },
};

describe('StrugglePreview — "See who struggled" on the wall', () => {
  beforeEach(() => {
    pro.hasPro = false;
    pro.loading = false;
  });

  it('given a round, when it renders, then it shows one blurred bar per student, weakest first, and never prints a name', () => {
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    const bars = screen.getAllByTestId('struggle-bar');
    expect(bars.map((b) => b.getAttribute('data-pct'))).toEqual(['10', '30', '60']);
    const panel = screen.getByTestId('struggle-preview');
    for (const name of ['Noa', 'Ido', 'Maya', 'Ms Cohen']) expect(panel.textContent).not.toContain(name);
  });

  it('given a free teacher, then the way in is the gated unlock ask, not the report', () => {
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(screen.getByTestId('unlock-report-upgrade-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('edu-results-report')).toBeNull();
  });

  it('given a Pro teacher, then it links straight to the class report', () => {
    pro.hasPro = true;
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(screen.getByTestId('edu-results-report')).toHaveAttribute('href', '/he/teacher/reports');
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
  });

  it('while entitlement is loading, then it offers neither door', () => {
    pro.loading = true;
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(screen.queryByTestId('edu-results-report')).toBeNull();
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
  });

  it('given no students with a tally, then it renders nothing', () => {
    const { container } = render(<StrugglePreview masteryByPlayer={{ 'Ms Cohen': { found: 0, total: 10 } }} teacherName="Ms Cohen" language="he" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
