/**
 * NotificationCategoryPreferences Tests
 * Tests for the notification category toggles settings panel
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationCategoryPreferences } from '../NotificationCategoryPreferences';
import type { ReactNode } from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'notifications.preferences.title': 'Notification Settings',
        'notifications.preferences.pushEnabled': 'Push Notifications',
        'notifications.preferences.dailyChallenge': 'Daily Challenge Reminder',
        'notifications.preferences.streakWarning': 'Streak at Risk Warning',
        'notifications.preferences.friendInvites': 'Friend Challenge Invites',
        'notifications.preferences.weeklySummary': 'Weekly Summary',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock categoryPreferences utils
const mockLoad = vi.fn();
const mockSave = vi.fn();

vi.mock('@/utils/pushNotifications', () => ({
  loadCategoryPreferences: (...args: unknown[]) => mockLoad(...args),
  saveCategoryPreferences: (...args: unknown[]) => mockSave(...args),
}));

describe('NotificationCategoryPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad.mockReturnValue({
      pushEnabled: true,
      dailyChallenge: true,
      streakWarning: true,
      friendInvites: true,
      weeklySummary: false,
    });
  });

  describe('rendering', () => {
    it('should render title and all category toggles', () => {
      // GIVEN - Default preferences

      // WHEN
      render(<NotificationCategoryPreferences />);

      // THEN
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      expect(screen.getByText('Daily Challenge Reminder')).toBeInTheDocument();
      expect(screen.getByText('Streak at Risk Warning')).toBeInTheDocument();
      expect(screen.getByText('Friend Challenge Invites')).toBeInTheDocument();
      expect(screen.getByText('Weekly Summary')).toBeInTheDocument();
    });

    it('should render toggles with correct initial state', () => {
      // GIVEN - Default preferences (weeklySummary off, rest on)

      // WHEN
      render(<NotificationCategoryPreferences />);
      const switches = screen.getAllByRole('switch');

      // THEN - master + 4 category toggles; first 4 on, weeklySummary off
      expect(switches).toHaveLength(5);
      expect(switches[0]).toHaveAttribute('aria-checked', 'true');
      expect(switches[1]).toHaveAttribute('aria-checked', 'true');
      expect(switches[2]).toHaveAttribute('aria-checked', 'true');
      expect(switches[3]).toHaveAttribute('aria-checked', 'true');
      expect(switches[4]).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('toggle interactions', () => {
    it('should toggle a category and save preferences', () => {
      // GIVEN
      render(<NotificationCategoryPreferences />);
      const switches = screen.getAllByRole('switch');

      // WHEN - Toggle daily challenge off (index 1; index 0 is master)
      fireEvent.click(switches[1]);

      // THEN
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ dailyChallenge: false })
      );
    });

    it('should toggle weeklySummary on', () => {
      // GIVEN
      render(<NotificationCategoryPreferences />);
      const switches = screen.getAllByRole('switch');

      // WHEN - Toggle weekly summary on (last switch)
      fireEvent.click(switches[4]);

      // THEN
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ weeklySummary: true })
      );
    });
  });
});
