/**
 * One class on the Classes tab: name, one fact, one primary action, one menu.
 * Everything else a teacher can do with the class lives in the menu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));

vi.mock('../GoogleClassroomRosterImport', () => ({
  GoogleClassroomRosterImport: () => <div data-testid="google-roster-import" />,
}));

vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

vi.mock('@/components/teacher/StudentCapMeter', () => ({
  StudentCapMeter: ({ studentCount, source }: { studentCount: number; source?: string }) => (
    <div data-testid="student-cap-meter" data-source={source} data-count={studentCount} />
  ),
}));

let hasPro = false;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro, loading: false }) }));

import { ClassCard } from '../ClassCard';

const CLASSROOM = { id: 'cls-1', name: 'Period 3', language: 'en', join_code: 'ABC123', member_count: 12 };

const baseProps = {
  classroom: CLASSROOM,
  expanded: false,
  onToggleExpanded: vi.fn(),
  onCopy: vi.fn(),
  onShare: vi.fn(),
  googleHref: 'https://classroom.google.com/share?url=x',
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  startGameHref: '/en/teacher?classroomId=cls-1',
  classHref: '/en/teacher/classroom/cls-1',
};

const LIME = /(^|\s)bg-neo-lime(\s|$)/;

describe('ClassCard on a list of classes: one lime action per screen', () => {
  it('Given the first card, Then Start a game is the lime primary', () => {
    render(<ClassCard {...baseProps} />);
    expect(screen.getByTestId('classroom-card-start-game').className).toMatch(LIME);
  });

  it('Given a card further down, Then Start a game is a dark secondary that still presses', () => {
    render(<ClassCard {...baseProps} lead={false} />);
    const start = screen.getByTestId('classroom-card-start-game');
    expect(start.className).not.toMatch(LIME);
    expect(start.className).toMatch(/bg-edu-surface/);
  });

  it('Given an empty class further down, Then Share code is not lime either', () => {
    render(<ClassCard {...baseProps} classroom={{ ...CLASSROOM, member_count: 0 }} lead={false} />);
    expect(screen.getByTestId('classroom-card-invite').className).not.toMatch(LIME);
  });
});
