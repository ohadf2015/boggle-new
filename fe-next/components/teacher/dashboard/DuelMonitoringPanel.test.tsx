/**
 * DuelMonitoringPanel Tests
 */

import { render, screen } from '@testing-library/react';
import { DuelMonitoringPanel } from './DuelMonitoringPanel';
import { useClassroomActivity } from '@/hooks/useClassroomActivity';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock hooks
vi.mock('@/hooks/useClassroomActivity');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

const mockUseClassroomActivity = useClassroomActivity as jest.MockedFunction<typeof useClassroomActivity>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

describe('DuelMonitoringPanel', () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: vi.fn(),
      dir: 'ltr',
      currentFlag: '🇺🇸',
    });
  });

  it('renders duel activity items', () => {
    mockUseClassroomActivity.mockReturnValue({
      activities: [
        {
          id: 'duel-1',
          type: 'duel_completed',
          actorId: 'user-1',
          actorName: 'Alice',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          metadata: {
            duelId: 'duel-1',
            winnerId: 'user-1',
            score: 150,
            duelType: 'async',
          },
        },
        {
          id: 'duel-2',
          type: 'duel_completed',
          actorId: 'user-2',
          actorName: 'Bob',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          metadata: {
            duelId: 'duel-2',
            winnerId: 'user-2',
            score: 120,
            duelType: 'realtime',
          },
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DuelMonitoringPanel classroomId="classroom-123" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows empty state when no duels', () => {
    mockUseClassroomActivity.mockReturnValue({
      activities: [],
      isLoading: false,
      error: null,
    });

    render(<DuelMonitoringPanel classroomId="classroom-123" />);

    expect(screen.getByText('teacher.duels.noDuels')).toBeInTheDocument();
  });

  it('displays winner names and scores', () => {
    mockUseClassroomActivity.mockReturnValue({
      activities: [
        {
          id: 'duel-1',
          type: 'duel_completed',
          actorId: 'user-1',
          actorName: 'Alice',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          metadata: {
            duelId: 'duel-1',
            winnerId: 'user-1',
            score: 150,
          },
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DuelMonitoringPanel classroomId="classroom-123" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });
});
