import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k), language: 'en' }),
}));
vi.mock('../../TeacherLastGameShortcut', () => ({ TeacherLastGameShortcut: () => null }));

import { HqDock } from '../HqDock';

const props = {
  classroomCount: 1,
  reportsHref: '/en/teacher/reports',
  lessonsOpen: false,
  onLessonsOpenChange: vi.fn(),
  lessons: null,
  toolsOpen: false,
  onToolsOpenChange: vi.fn(),
  proOpen: false,
  onProOpenChange: vi.fn(),
};

describe('<HqDock> — quiet chrome above the two steps on a phone', () => {
  it('Given a phone, Then Tools is an icon button whose name is still read out, with its cream edge kept', () => {
    render(<HqDock {...props} />);
    const summary = screen.getByTestId('teacher-tools').querySelector('summary') as HTMLElement;
    const label = summary.querySelector('span');
    expect(label?.textContent).toBe('teacher.dashboard.tools');
    expect(label?.className).toMatch(/(^|\s)max-sm:sr-only(\s|$)/);
    expect(summary.className).toMatch(/(^|\s)border-neo-cream(\s|$)/);
  });

  it('Given a Pro ask, Then the Go Pro chip keeps its visible label on every width', () => {
    render(<HqDock {...props} pro={<div />} />);
    const summary = screen.getByTestId('teacher-dashboard-banner').querySelector('summary') as HTMLElement;
    expect(summary).toHaveTextContent('Go Pro');
    expect(summary.querySelector('span')?.className ?? '').not.toMatch(/sr-only/);
  });
});
