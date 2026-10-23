import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));

import { UpgradeYourClasses } from '../UpgradeYourClasses';

const cls = (id: string, name: string, member_count: number) => ({ id, name, member_count });

describe('UpgradeYourClasses', () => {
  it('given a teacher with classes, then each class says what Pro adds for its students', () => {
    render(<UpgradeYourClasses classes={[cls('a', 'Room 7B', 12), cls('b', 'Spanish 2', 0)]} />);

    expect(screen.getByTestId('upgrade-your-classes')).toBeInTheDocument();
    const rows = screen.getAllByTestId('upgrade-your-class');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Room 7B');
    expect(within(rows[0]).getByTestId('upgrade-class-students').textContent).toBe('12');
    expect(rows[0].textContent).toContain('education.landing.pro.analytics');
    expect(rows[1].textContent).toContain('academy.hq.firstStudentTitle');
    expect(screen.getByRole('heading').textContent).toBe('eg2Seo.detail.leadPro');
  });

  it('shows how much of the free class cap is used', () => {
    render(<UpgradeYourClasses classes={[cls('a', 'Room 7B', 3), cls('b', 'Spanish 2', 1)]} />);
    expect(screen.getByTestId('upgrade-class-cap').textContent).toBe('teacher.subscription.classLimitMessage|2|3');
  });

  it('lists at most three classes and counts the rest', () => {
    const many = [1, 2, 3, 4, 5].map((n) => cls(String(n), `Class ${n}`, n));
    render(<UpgradeYourClasses classes={many} />);
    expect(screen.getAllByTestId('upgrade-your-class')).toHaveLength(3);
    expect(screen.getByTestId('upgrade-your-classes-more').textContent).toBe('tvBroadcast.moreStudents|2');
  });

  it('renders nothing for a teacher with no classes', () => {
    const { container } = render(<UpgradeYourClasses classes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
