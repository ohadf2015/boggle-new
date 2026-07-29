/**
 * QuickStartButton Tests
 *
 * Tests for the one-click game replay button
 * Following TDD RED-GREEN-REFACTOR cycle
 */

import { render, screen, fireEvent } from '@testing-library/react';
import QuickStartButton from '../QuickStartButton';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

// Mock hooks
const mockNavigate = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockNavigate,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'teacher.dashboard.quickStart': 'Quick Start',
        'teacher.dashboard.repeatLastGame': 'Repeat Last Game',
        'teacher.dashboard.lastPlayed': 'Last played',
        'common.minutes': 'min',
        'education.classroomGame.words': 'words',
      })[key] || key,
    language: 'en',
  }),
}));

describe('QuickStartButton', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // Helper to create a valid game configuration
  const createConfig = (overrides: Partial<GameConfiguration> = {}): GameConfiguration => ({
    id: 'config-1',
    classroomId: 'classroom-1',
    classroomName: 'Math Class',
    lessonIds: ['lesson-1', 'lesson-2'],
    lessonNames: ['Numbers', 'Shapes'],
    settings: {
      timerMinutes: 3,
      boardSize: 'medium',
      allowLateJoin: true,
    },
    savedAt: Date.now(),
    ...overrides,
  });

  describe('rendering', () => {
    it('should render when config is provided', () => {
      render(<QuickStartButton config={createConfig()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not render when config is null', () => {
      const { container } = render(<QuickStartButton config={null} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display classroom name', () => {
      render(<QuickStartButton config={createConfig({ classroomName: 'Science Lab' })} />);

      expect(screen.getByText('Science Lab')).toBeInTheDocument();
    });

    it('should display lesson names', () => {
      render(
        <QuickStartButton
          config={createConfig({ lessonNames: ['Vocabulary', 'Grammar'] })}
        />
      );

      expect(screen.getByText(/Vocabulary/)).toBeInTheDocument();
    });

    it('should display timer setting', () => {
      render(
        <QuickStartButton
          config={createConfig({
            settings: { timerMinutes: 5, boardSize: 'medium', allowLateJoin: true },
          })}
        />
      );

      // Check for "5 min" text (timer display)
      expect(screen.getByText(/5 min/)).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<QuickStartButton config={createConfig()} onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should pass the config to onClick handler', () => {
      const onClick = vi.fn();
      const config = createConfig({ classroomId: 'test-classroom' });
      render(<QuickStartButton config={config} onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledWith(config);
    });
  });

  describe('accessibility', () => {
    it('should have accessible button', () => {
      render(<QuickStartButton config={createConfig()} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
