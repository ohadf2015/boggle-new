import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('../GoogleClassroomRosterImport', () => ({ GoogleClassroomRosterImport: () => null }));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({ default: () => null }));
vi.mock('@/components/teacher/StudentCapMeter', () => ({ StudentCapMeter: () => <div data-testid="student-cap-meter" /> }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));

import { ClassCard } from '../ClassCard';

const props = {
  classroom: { id: 'cls-1', name: 'Period 3', language: 'en', join_code: 'ABC123', member_count: 12 },
  expanded: false,
  onToggleExpanded: vi.fn(),
  onCopy: vi.fn(),
  onShare: vi.fn(),
  googleHref: null,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  startGameHref: '/en/education/classroom-game?classroomId=cls-1',
};

describe('ClassCard class page and weekly insight', () => {
  it('Given a class page link, Then the class name opens the class page', () => {
    render(<ClassCard {...props} classHref="/en/teacher/classroom/cls-1" />);
    expect(screen.getByRole('link', { name: 'Period 3' })).toHaveAttribute('href', '/en/teacher/classroom/cls-1');
  });

  it('Given the free weekly insight for this class, Then the card links to "Who needs help this week" and keeps the cap meter', () => {
    render(<ClassCard {...props} insightHref="/en/teacher/classroom/cls-1/analytics" />);
    const link = screen.getByTestId('classroom-card-insight');
    expect(link).toHaveAttribute('href', '/en/teacher/classroom/cls-1/analytics');
    expect(link).toHaveTextContent('teacher.weekInsight.title');
    expect(screen.getByTestId('student-cap-meter')).toBeInTheDocument();
  });

  it('Given no insight link, Then the card shows none', () => {
    render(<ClassCard {...props} />);
    expect(screen.queryByTestId('classroom-card-insight')).toBeNull();
  });
});
