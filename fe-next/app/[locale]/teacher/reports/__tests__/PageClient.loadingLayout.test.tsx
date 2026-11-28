import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportsPageClient from '../PageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/education/TeacherGate', () => ({
  TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../ReportsGate', () => ({
  ReportsProGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));
vi.mock('@/components/teacher/HeadingMascot', () => ({ HeadingMascot: () => null }));

const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => search.params,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher/reports',
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: null, isLoading: true, error: null }),
}));
vi.mock('../ReportsClassView', () => ({
  ReportsClassView: ({ weekPanel }: { weekPanel: React.ReactNode }) => <div data-testid="class-view">{weekPanel}</div>,
}));

const ids = () => [...document.querySelectorAll('[data-testid]')].map((n) => n.getAttribute('data-testid'));

describe('Reports while the class list is loading', () => {
  it('holds the week and reteach panels above the picker so nothing lands on top of it later', () => {
    // Given the reports landing with classes still loading
    search.params = new URLSearchParams();
    render(<ReportsPageClient />);

    // Then both panels already have their placeholder, in final order, before the picker
    const order = ids();
    const week = order.indexOf('classroom-week-loading');
    const reteach = order.indexOf('reports-reteach-panel');
    const picker = order.indexOf('reports-picker-loading');
    expect(week).toBeGreaterThan(-1);
    expect(reteach).toBeGreaterThan(week);
    expect(picker).toBeGreaterThan(reteach);
  });

  it('gives a deep-linked class report its week placeholder before the class list arrives', () => {
    // Given a class report URL while classes load
    search.params = new URLSearchParams('classroomId=11111111-1111-4111-8111-111111111111');
    render(<ReportsPageClient />);

    // Then the week panel slot is already held
    expect(screen.getByTestId('class-view')).toContainElement(screen.getByTestId('classroom-week-loading'));
  });
});
