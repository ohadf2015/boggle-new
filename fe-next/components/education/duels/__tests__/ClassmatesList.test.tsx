/**
 * ClassmatesList Component Tests
 *
 * TDD: Tests written BEFORE implementation
 * Tests classmates list rendering with challenge buttons
 */

import { render, screen } from '@testing-library/react';
import { ClassmatesList } from '../ClassmatesList';
import type { ClassroomStudent } from '@/lib/supabase/education';

// ============================================
// MOCKS
// ============================================

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

// Mock ChallengeButton
vi.mock('../ChallengeButton', () => ({
  ChallengeButton: ({ opponentId, variant }: any) => (
    <div data-testid={`challenge-button-${variant}`} data-opponent-id={opponentId}>
      Challenge Button
    </div>
  ),
}));

// ============================================
// TEST DATA
// ============================================

const createMockClassmate = (id: string, username: string, avatarEmoji?: string): ClassroomStudent => ({
  id: `membership-${id}`,
  student_id: id,
  classroom_id: 'classroom-123',
  joined_at: new Date().toISOString(),
  profiles: {
    username,
    avatar_emoji: avatarEmoji || '👤',
  },
});

const mockClassmates: ClassroomStudent[] = [
  createMockClassmate('user-1', 'Alice', '🦊'),
  createMockClassmate('user-2', 'Bob', '🐻'),
  createMockClassmate('user-3', 'Charlie', '🦁'),
];

const mockLessons = [
  { id: 'lesson-1', name: 'Animals' },
  { id: 'lesson-2', name: 'Colors' },
];

// ============================================
// TESTS
// ============================================

describe('ClassmatesList', () => {
  it('renders classmate rows with display name and avatar emoji', () => {
    const { container } = render(
      <ClassmatesList
        classmates={mockClassmates}
        classroomId="classroom-123"
        lessons={mockLessons}
        currentUserId="current-user"
      />
    );

    // Assert all 3 classmates are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Assert Avatar components are rendered for each classmate
    // Avatar component renders complex SVG/img - verify 3 avatar wrappers exist
    const classmateDivs = container.querySelectorAll('.flex.items-center.gap-3');
    expect(classmateDivs.length).toBe(3);
  });

  it('filters out the current user from the list', () => {
    const classmatesWithCurrentUser = [
      ...mockClassmates,
      createMockClassmate('current-user', 'CurrentUser', '👑'),
    ];

    render(
      <ClassmatesList
        classmates={classmatesWithCurrentUser}
        classroomId="classroom-123"
        lessons={mockLessons}
        currentUserId="current-user"
      />
    );

    // Assert current user is NOT rendered
    expect(screen.queryByText('CurrentUser')).not.toBeInTheDocument();
    expect(screen.queryByText('👑')).not.toBeInTheDocument();

    // Assert other classmates are still rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('renders ChallengeButton (icon variant) for each classmate', () => {
    render(
      <ClassmatesList
        classmates={mockClassmates}
        classroomId="classroom-123"
        lessons={mockLessons}
        currentUserId="current-user"
      />
    );

    // Assert icon variant buttons are rendered
    const iconButtons = screen.getAllByTestId('challenge-button-icon');
    expect(iconButtons).toHaveLength(3);

    // Assert buttons have correct opponent IDs
    expect(iconButtons[0]).toHaveAttribute('data-opponent-id', 'user-1');
    expect(iconButtons[1]).toHaveAttribute('data-opponent-id', 'user-2');
    expect(iconButtons[2]).toHaveAttribute('data-opponent-id', 'user-3');
  });

  it('shows empty state when no classmates after filtering', () => {
    const onlyCurrentUser = [createMockClassmate('current-user', 'CurrentUser')];

    render(
      <ClassmatesList
        classmates={onlyCurrentUser}
        classroomId="classroom-123"
        lessons={mockLessons}
        currentUserId="current-user"
      />
    );

    // Assert empty state message is shown
    expect(screen.getByText('noClassmatesFound')).toBeInTheDocument();

    // Assert no challenge buttons are rendered
    expect(screen.queryByTestId('challenge-button-icon')).not.toBeInTheDocument();
  });

  it('respects maxItems prop', () => {
    const fiveClassmates = [
      createMockClassmate('user-1', 'Alice'),
      createMockClassmate('user-2', 'Bob'),
      createMockClassmate('user-3', 'Charlie'),
      createMockClassmate('user-4', 'David'),
      createMockClassmate('user-5', 'Eve'),
    ];

    render(
      <ClassmatesList
        classmates={fiveClassmates}
        classroomId="classroom-123"
        lessons={mockLessons}
        currentUserId="current-user"
        maxItems={3}
      />
    );

    // Assert only 3 challenge buttons are rendered
    const iconButtons = screen.getAllByTestId('challenge-button-icon');
    expect(iconButtons).toHaveLength(3);

    // Assert first 3 classmates are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Assert last 2 classmates are NOT rendered
    expect(screen.queryByText('David')).not.toBeInTheDocument();
    expect(screen.queryByText('Eve')).not.toBeInTheDocument();
  });
});
