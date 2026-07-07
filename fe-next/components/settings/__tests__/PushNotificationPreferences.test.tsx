/**
 * PushNotificationPreferences Component Tests
 * Tests for the push notification settings component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushNotificationPreferences } from '../PushNotificationPreferences';
import { Children, isValidElement, type ReactNode } from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Radix Select isn't a native <select> (no change event) — stand in with a
// native select so existing fireEvent.change-based tests still drive it.
// The aria-label lives on SelectTrigger in real usage, so it's lifted onto
// the underlying <select> here (SelectTrigger itself is a pure passthrough).
vi.mock('@/components/ui/select', () => {
  const Select = ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
    children: ReactNode;
  }) => {
    let ariaLabel: string | undefined;
    Children.forEach(children, (child) => {
      if (isValidElement(child) && (child.props as Record<string, unknown>)['aria-label']) {
        ariaLabel = (child.props as Record<string, string>)['aria-label'];
      }
    });
    return (
      <select value={value} disabled={disabled} aria-label={ariaLabel} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    );
  };
  const SelectItem = ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  );
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    Select,
    SelectContent: passthrough,
    SelectItem,
    SelectTrigger: passthrough,
    SelectValue: passthrough,
  };
});

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pushNotifications.settings.title': 'Push Notifications',
        'pushNotifications.settings.enabled': 'Daily Reminder',
        'pushNotifications.settings.enabledDesc': 'Morning nudge to play',
        'pushNotifications.settings.time': 'Reminder Time',
        'pushNotifications.settings.timeDesc': 'When to wake you up',
        'pushNotifications.settings.permissionDenied': 'Notifications Blocked',
        'pushNotifications.settings.permissionDeniedDesc': 'Enable in device settings',
        'pushNotifications.settings.openSettings': 'Open Settings',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock usePushNotifications hook
const mockSetEnabled = vi.fn();
const mockSetTime = vi.fn();
const mockRequestPermission = vi.fn();

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn(() => ({
    isAvailable: true,
    permissionStatus: 'granted',
    isLoading: false,
    preferences: {
      enabled: true,
      hour: 9,
      minute: 0,
    },
    setEnabled: mockSetEnabled,
    setTime: mockSetTime,
    requestPermission: mockRequestPermission,
  })),
}));

import { usePushNotifications } from '@/hooks/usePushNotifications';

const mockUsePushNotifications = usePushNotifications as vi.MockedFunction<
  typeof usePushNotifications
>;

describe('PushNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetEnabled.mockResolvedValue(undefined);
    mockSetTime.mockResolvedValue(undefined);
    mockRequestPermission.mockResolvedValue(true);
  });

  describe('rendering', () => {
    it('should render title and toggle when available', () => {
      // GIVEN - Default hook state (available, granted, enabled)

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Should show title and toggle
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should not render when push notifications are unavailable', () => {
      // GIVEN - Hook returns unavailable
      mockUsePushNotifications.mockReturnValue({
        isAvailable: false,
        permissionStatus: 'denied',
        isLoading: false,
        preferences: { enabled: false, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      const { container } = render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Should render nothing
      expect(container.firstChild).toBeNull();
    });

    it('should show loading state', () => {
      // GIVEN - Hook is loading
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'denied',
        isLoading: true,
        preferences: { enabled: false, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Should show loading indicator (Loader renders an element)
      expect(screen.getByTestId('push-notifications-loading')).toBeInTheDocument();
    });
  });

  describe('toggle functionality', () => {
    it('should call setEnabled when toggle is clicked', async () => {
      // GIVEN - Notifications are enabled
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: true, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Toggle is clicked
      render(<PushNotificationPreferences isDarkMode={false} />);
      fireEvent.click(screen.getByRole('switch'));

      // THEN - Should call setEnabled with false
      await waitFor(() => {
        expect(mockSetEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should show toggle as checked when enabled', () => {
      // GIVEN - Notifications are enabled
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: true, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Toggle should be checked
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('should show toggle as unchecked when disabled', () => {
      // GIVEN - Notifications are disabled
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: false, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Toggle should be unchecked
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('time selection', () => {
    it('should show time selector when enabled', () => {
      // GIVEN - Notifications are enabled with permission
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: true, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Should show time selector
      expect(screen.getByText('Reminder Time')).toBeInTheDocument();
    });

    it('should not show time selector when disabled', () => {
      // GIVEN - Notifications are disabled
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: false, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Should not show time selector
      expect(screen.queryByText('Reminder Time')).not.toBeInTheDocument();
    });

    it('should call setTime when time is changed', async () => {
      // GIVEN - Notifications are enabled
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: true, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Time is changed
      render(<PushNotificationPreferences isDarkMode={false} />);
      const hourSelect = screen.getByLabelText(/hour/i);
      fireEvent.change(hourSelect, { target: { value: '10' } });

      // THEN - Should call setTime with new hour
      await waitFor(() => {
        expect(mockSetTime).toHaveBeenCalledWith(10, 0);
      });
    });
  });

  describe('permission handling', () => {
    it('should show permission denied message when permission is denied', () => {
      // GIVEN - Permission is denied
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'denied',
        isLoading: false,
        preferences: { enabled: false, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered
      render(<PushNotificationPreferences isDarkMode={false} />);

      // THEN - Should show permission denied message
      expect(screen.getByText('Notifications Blocked')).toBeInTheDocument();
    });
  });

  describe('dark mode', () => {
    it('should apply dark mode styles when isDarkMode is true', () => {
      // GIVEN - Dark mode is enabled
      mockUsePushNotifications.mockReturnValue({
        isAvailable: true,
        permissionStatus: 'granted',
        isLoading: false,
        preferences: { enabled: true, hour: 9, minute: 0 },
        setEnabled: mockSetEnabled,
        setTime: mockSetTime,
        requestPermission: mockRequestPermission,
        markChallengeCompleted: vi.fn(),
        hasPendingNotification: vi.fn(),
      });

      // WHEN - Component is rendered with dark mode
      const { container } = render(<PushNotificationPreferences isDarkMode={true} />);

      // THEN - Should have dark mode classes
      expect(container.firstChild).toHaveClass('bg-neo-navy-light/50');
    });
  });
});
