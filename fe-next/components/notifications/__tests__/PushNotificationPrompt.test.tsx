/**
 * PushNotificationPrompt Tests
 * Tests for the engagement-triggered push notification permission prompt
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushNotificationPrompt } from '../PushNotificationPrompt';
import { registerPushToken } from '@/utils/pushNotifications/tokenRegistration';
import type { ReactNode } from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
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
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'notifications.prompt.title': 'Stay in the Game!',
        'notifications.prompt.body':
          'Get reminders for daily challenges and streak warnings',
        'notifications.prompt.firstWinTitle': 'Nice win!',
        'notifications.prompt.firstWinBody':
          'Turn on notifications to keep your streak alive',
        'notifications.prompt.enable': 'Enable Notifications',
        'notifications.prompt.notNow': 'Not Now',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock categoryPreferences
const mockShouldShow = vi.fn();
const mockShouldShowFirstWin = vi.fn();
const mockClearFirstWinPending = vi.fn();
const mockDismiss = vi.fn();

vi.mock('@/utils/pushNotifications', () => ({
  shouldShowPushPrompt: (...args: unknown[]) => mockShouldShow(...args),
  shouldShowFirstWinPushPrompt: (...args: unknown[]) => mockShouldShowFirstWin(...args),
  clearFirstWinPromptPending: (...args: unknown[]) => mockClearFirstWinPending(...args),
  dismissPushPrompt: (...args: unknown[]) => mockDismiss(...args),
}));

// Mock registerPushToken
vi.mock('@/utils/pushNotifications/tokenRegistration', () => ({
  registerPushToken: vi.fn().mockResolvedValue(true),
}));

// Mock growthTracking — telemetry contract for the push-prompt funnel
const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

// Cookie-consent gate: prompt holds until consent is resolved. Default true.
const mockConsentDecided = vi.fn<() => boolean>();
vi.mock('@/hooks/useConsentDecided', () => ({
  useConsentDecided: () => mockConsentDecided(),
}));

describe('PushNotificationPrompt', () => {
  let originalNotification: typeof Notification;

  beforeEach(() => {
    vi.clearAllMocks();
    originalNotification = window.Notification;
    mockShouldShow.mockReturnValue(true);
    mockShouldShowFirstWin.mockReturnValue(false);
    mockConsentDecided.mockReturnValue(true);
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

    it('should not render while cookie consent is undecided, even if qualified', () => {
      // GIVEN - prompt qualifies but consent banner is still pending
      mockShouldShow.mockReturnValue(true);
      mockConsentDecided.mockReturnValue(false);

      // WHEN
      const { container } = render(<PushNotificationPrompt />);

      // THEN - held back so it doesn't stack under the consent banner
      expect(container.firstChild).toBeNull();
      expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
        'push_prompt_shown',
        expect.anything(),
      );
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

    it('should call registerPushToken when Enable is clicked', async () => {
      // GIVEN - Prompt visible; component delegates to registerPushToken
      // (handles native Capacitor perms, no-op on web). Do NOT assert on
      // window.Notification.requestPermission — native WebView exposes it
      // but it does not trigger the native push-perm dialog.
      mockShouldShow.mockReturnValue(true);

      render(<PushNotificationPrompt />);

      // WHEN
      fireEvent.click(screen.getByText('Enable Notifications'));

      // THEN
      await waitFor(() => {
        expect(registerPushToken).toHaveBeenCalled();
      });
    });
  });

  describe('first-win trigger (D1 re-engagement)', () => {
    it('shows celebratory first-win copy when the first-win gate opens', () => {
      // GIVEN - a first win just landed; games threshold not yet met
      mockShouldShow.mockReturnValue(false);
      mockShouldShowFirstWin.mockReturnValue(true);

      // WHEN
      render(<PushNotificationPrompt />);

      // THEN - first-win copy, pending flag consumed, tagged trigger
      expect(screen.getByText('Nice win!')).toBeInTheDocument();
      expect(mockClearFirstWinPending).toHaveBeenCalled();
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith('push_prompt_shown', {
        trigger: 'first_win',
      });
    });

    it('prefers the first-win gate over the games threshold', () => {
      mockShouldShow.mockReturnValue(true);
      mockShouldShowFirstWin.mockReturnValue(true);

      render(<PushNotificationPrompt />);

      expect(screen.getByText('Nice win!')).toBeInTheDocument();
    });

    it('tags granted/dismissed events with the first-win trigger', async () => {
      mockShouldShow.mockReturnValue(false);
      mockShouldShowFirstWin.mockReturnValue(true);

      render(<PushNotificationPrompt />);
      fireEvent.click(screen.getByText('Enable Notifications'));

      await waitFor(() => {
        expect(mockTrackGrowthEvent).toHaveBeenCalledWith('push_prompt_granted', {
          trigger: 'first_win',
        });
      });
    });

    it('opens mid-session when the first-win event fires after mount', async () => {
      // GIVEN - mounted while neither gate is open (player still in game)
      mockShouldShow.mockReturnValue(false);
      const { container } = render(<PushNotificationPrompt />);
      expect(container.firstChild).toBeNull();

      // WHEN - the win lands and arms the prompt
      mockShouldShowFirstWin.mockReturnValue(true);
      fireEvent(window, new Event('lexiclash:first-win'));

      // THEN
      await waitFor(() => {
        expect(screen.getByText('Nice win!')).toBeInTheDocument();
      });
    });
  });

  describe('telemetry', () => {
    // PostHog 30d 2026-05-05 had zero observability on push-prompt funnel —
    // unable to measure show rate, dismiss rate, or grant rate. Without
    // instrumentation, the MIN_GAMES_BEFORE_PROMPT=3 threshold cannot be
    // tuned against actual conversion data. Three events form the funnel:
    // shown → (dismissed | granted | failed).
    it('emits push_prompt_shown when prompt becomes visible', () => {
      mockShouldShow.mockReturnValue(true);

      render(<PushNotificationPrompt />);

      expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
        'push_prompt_shown',
        expect.any(Object),
      );
    });

    it('does NOT emit push_prompt_shown when prompt is hidden', () => {
      mockShouldShow.mockReturnValue(false);

      render(<PushNotificationPrompt />);

      expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
        'push_prompt_shown',
        expect.anything(),
      );
    });

    it('emits push_prompt_dismissed when Not Now is clicked', () => {
      mockShouldShow.mockReturnValue(true);

      render(<PushNotificationPrompt />);
      fireEvent.click(screen.getByText('Not Now'));

      expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
        'push_prompt_dismissed',
        expect.any(Object),
      );
    });

    it('emits push_prompt_granted when Enable resolves successfully', async () => {
      mockShouldShow.mockReturnValue(true);

      render(<PushNotificationPrompt />);
      fireEvent.click(screen.getByText('Enable Notifications'));

      await waitFor(() => {
        expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
          'push_prompt_granted',
          expect.any(Object),
        );
      });
    });
  });
});
