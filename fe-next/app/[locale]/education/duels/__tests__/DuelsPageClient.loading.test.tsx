import { vi, type Mock, } from 'vitest';
/**
 * DuelsPageClient loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare spinner div
 */

import { render, screen } from '@testing-library/react';
import DuelsPageClient from '../PageClient';

// Mock supabase calls to never resolve (keep component in loading state)
vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: vi.fn(() => new Promise(() => {})),
  getLessons: vi.fn(() => new Promise(() => {})),
  getClassroomStudents: vi.fn(() => new Promise(() => {})),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-123', email: 'student@test.com' },
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock child components that bring in heavy dependencies
vi.mock('@/components/education/duels', () => ({
  DuelLobby: () => <div data-testid="duel-lobby" />,
  DuelHistory: () => <div data-testid="duel-history" />,
  DuelNotification: () => null,
}));

vi.mock('@/components/education/duels/ClassmatesList', () => ({
  ClassmatesList: () => <div data-testid="classmates-list" />,
}));

// Mock PageLoader so we can detect it reliably
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

describe('DuelsPageClient — loading state', () => {
  it('renders PageLoader when loading data', () => {
    render(<DuelsPageClient />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows contextual loading text', () => {
    render(<DuelsPageClient />);

    expect(screen.getByText('Finding your classmates...')).toBeInTheDocument();
  });

  it('does not render tabs while loading', () => {
    render(<DuelsPageClient />);

    // Tab buttons only show after loading completes
    expect(screen.queryByTestId('duel-lobby')).not.toBeInTheDocument();
  });
});
