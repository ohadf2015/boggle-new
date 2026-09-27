import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentsPresentStrip from '../StudentsPresentStrip';

vi.mock('@/contexts/LanguageContext', () => {
  const mockT = (key: string, params?: Record<string, any>) => {
    if (key === 'teacher.dashboard.studentsPresentTitle') {
      return params?.count ? `${params.count} students are in ${params.classroom}` : 'Students are present';
    }
    if (key === 'teacher.dashboard.studentsPresentDescription') {
      return 'Start a game to get them playing';
    }
    return key;
  };

  return {
    useLanguage: () => ({
      language: 'en',
      t: mockT,
      setLanguage: vi.fn(),
    }),
    LanguageContext: { Provider: ({ children }: any) => children },
  };
});

describe('StudentsPresentStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when total member count is greater than 0', () => {
    // GIVEN: Classrooms with students
    const classrooms = [
      { id: '1', name: '3RD GRADE', member_count: 2 } as any,
      { id: '2', name: 'ADVANCED', member_count: 1 } as any,
    ];

    // WHEN: Render component
    render(<StudentsPresentStrip classrooms={classrooms} />);

    // THEN: Should show the strip
    expect(screen.getByTestId('students-present-strip')).toBeInTheDocument();
    expect(screen.getByText(/3 students are in 3RD GRADE/)).toBeInTheDocument();
    expect(screen.getByText(/Start a game to get them playing/)).toBeInTheDocument();
  });

  it('should not render when member count is 0', () => {
    // GIVEN: Classrooms with no students
    const classrooms = [
      { id: '1', name: '3RD GRADE', member_count: 0 } as any,
      { id: '2', name: 'ADVANCED', member_count: 0 } as any,
    ];

    // WHEN: Render component
    const { container } = render(<StudentsPresentStrip classrooms={classrooms} />);

    // THEN: Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('should not render when classrooms array is empty', () => {
    // GIVEN: No classrooms
    const classrooms: any[] = [];

    // WHEN: Render component
    const { container } = render(<StudentsPresentStrip classrooms={classrooms} />);

    // THEN: Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('should render solid background with proper contrast', () => {
    // GIVEN: Classrooms with students
    const classrooms = [
      { id: '1', name: '3RD GRADE', member_count: 3 } as any,
    ];

    // WHEN: Render component
    render(<StudentsPresentStrip classrooms={classrooms} />);

    // THEN: Should use solid background color (cyan, pink, purple, or lime)
    const strip = screen.getByTestId('students-present-strip');
    const classList = strip.className;

    // Should have a solid background (not translucent)
    expect(classList).toMatch(/bg-neo-(cyan|pink|purple|lime)/);
  });

  it('should use first classroom with students for display', () => {
    // GIVEN: Multiple classrooms with first empty, second with students
    const classrooms = [
      { id: '1', name: 'EMPTY CLASS', member_count: 0 } as any,
      { id: '2', name: 'FULL CLASS', member_count: 5 } as any,
    ];

    // WHEN: Render component
    render(<StudentsPresentStrip classrooms={classrooms} />);

    // THEN: Should show the first non-empty classroom
    expect(screen.getByText(/FULL CLASS/)).toBeInTheDocument();
    expect(screen.getByText(/5 students are in FULL CLASS/)).toBeInTheDocument();
  });
});
