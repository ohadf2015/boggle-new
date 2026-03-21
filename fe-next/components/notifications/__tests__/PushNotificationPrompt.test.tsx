/**
 * PushNotificationPrompt Tests
 * Tests for the engagement-triggered push notification permission prompt
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushNotificationPrompt } from '../PushNotificationPrompt';
import type { ReactNode } from 'react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...props
    }: { children: ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'notifications.prompt.title': 'Stay in the Game!',
        'notifications.prompt.body':
          'Get reminders for daily challenges and streak warnings',
        'notifications.prompt.enable': 'Enable Notifications',
        'notifications.prompt.notNow': 'Not Now',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock categoryPreferences
const mockShouldShow = jest.fn();
const mockDismiss = jest.fn();

jest.mock('@/utils/pushNotifications', () => ({
  shouldShowPushPrompt: (...args: unknown[]) => mockShouldShow(...args),
  dismissPushPrompt: (...args: unknown[]) => mockDismiss(...args),
}));

// Mock registerPushToken
jest.mock('@/utils/pushNotifications/tokenRegistration', () => ({
  registerPushToken: jest.fn().mockResolvedValue(true),
}));

describe('PushNotificationPrompt', () => {
  let originalNotification: typeof Notification;

  beforeEach(() => {
    jest.clearAllMocks();
    originalNotification = window.Notification;
    mockShouldShow.mockReturnValue(true);
  });

  afterEach(() => {
    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
  });

  describe('rendering', () => {
    it('should render when shouldShowPushPrompt returns true', () => {
      // GIVEN - Prompt conditions met
      mockShouldShow.mockReturnValue(true);

      // WHEN
      render(<PushNotificationPrompt />);

      // THEN
      expect(screen.getByText('Stay in the Game!')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Get reminders for daily challenges and streak warnings'
        )
      ).toBeInTheDocument();
    });

    it('should not render when shouldShowPushPrompt returns false', () => {
      // GIVEN - Prompt conditions not met
      mockShouldShow.mockReturnValue(false);

      // WHEN
      const { container } = render(<PushNotificationPrompt />);

      // THEN
      expect(container.firstChild).toBeNull();
    });

    it('should show both action buttons', () => {
      // GIVEN
      mockShouldShow.mockReturnValue(true);

      // WHEN
      render(<PushNotificationPrompt />);

      // THEN
      expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      expect(screen.getByText('Not Now')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should dismiss and set delay when Not Now is clicked', () => {
      // GIVEN
      mockShouldShow.mockReturnValue(true);
      render(<PushNotificationPrompt />);

      // WHEN
      fireEvent.click(screen.getByText('Not Now'));

      // THEN
      expect(mockDismiss).toHaveBeenCalled();
    });

    it('should request permission when Enable is clicked', async () => {
      // GIVEN - Permission can be requested
      const mockRequestPermission = jest.fn().mockResolvedValue('granted');
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        writable: true,
        configurable: true,
      });
      mockShouldShow.mockReturnValue(true);

      render(<PushNotificationPrompt />);

      // WHEN
      fireEvent.click(screen.getByText('Enable Notifications'));

      // THEN
      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });
  });
});
