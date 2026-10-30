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

describe('StrugglePreview — the Pro report door on the wall', () => {
  beforeEach(() => {
    pro.hasPro = true;
    pro.loading = false;
  });

  it('given a round, when it renders, then it shows one bar per student, weakest first, and never prints a name', () => {
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    const bars = screen.getAllByTestId('struggle-bar');
    expect(bars.map((b) => b.getAttribute('data-pct'))).toEqual(['10', '30', '60']);
    const panel = screen.getByTestId('struggle-preview');
    for (const name of ['Noa', 'Ido', 'Maya', 'Ms Cohen']) expect(panel.textContent).not.toContain(name);
  });

  it('given the teacher wall, then the preview is calm: cream bars and a normal-case link, no pink, yellow or lime', () => {
    const { container } = render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(container.innerHTML).not.toMatch(/bg-neo-(pink|yellow|lime)\b|\buppercase\b/);
  });

  it('given a free teacher, then it renders nothing: the wall has one Pro slot and the trial card holds it', () => {
    pro.hasPro = false;
    const { container } = render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('given a Pro teacher, then it links straight to the class report', () => {
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(screen.getByTestId('edu-results-report')).toHaveAttribute('href', '/he/teacher/reports');
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
  });

  it('while entitlement is loading, then it offers neither door', () => {
    pro.loading = true;
    render(<StrugglePreview masteryByPlayer={mastery} teacherName="Ms Cohen" language="he" t={t} />);
    expect(screen.queryByTestId('edu-results-report')).toBeNull();
    expect(screen.queryByTestId('struggle-preview')).toBeNull();
  });

  it('given no students with a tally, then it renders nothing', () => {
    const { container } = render(<StrugglePreview masteryByPlayer={{ 'Ms Cohen': { found: 0, total: 10 } }} teacherName="Ms Cohen" language="he" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
