/**
 * Notification Scheduler Tests
 * Tests for scheduling, canceling, and managing daily challenge notifications
 */

import {
  scheduleDailyNotification,
  cancelDailyNotification,
  getNextMessageIndex,
  getRandomLetterHint,
  buildNotificationContent,
} from '../scheduler';
import { NOTIFICATION_IDS, NOTIFICATION_MESSAGES } from '../types';

// Mock the platform utility
vi.mock('../../platform', () => ({
  isNative: vi.fn(),
}));

// Mock permissions
vi.mock('../permissions', () => ({
  canScheduleNotifications: vi.fn(),
}));

import { isNative } from '../../platform';
import { canScheduleNotifications } from '../permissions';

const mockIsNative = isNative as any;
const mockCanSchedule = canScheduleNotifications as any;

// Mock functions for LocalNotifications
const mockSchedule = vi.fn();
const mockCancel = vi.fn();
const mockGetPending = vi.fn();

describe('Notification Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up globalThis.Capacitor with LocalNotifications plugin
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          schedule: mockSchedule,
          cancel: mockCancel,
          getPending: mockGetPending,
        },
      },
    };
    // Reset localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  describe('scheduleDailyNotification', () => {
    it('should return failure on web platform', async () => {
      // GIVEN - Running on web
      mockIsNative.mockReturnValue(false);

      // WHEN - Attempting to schedule
      const result = await scheduleDailyNotification({ hour: 9, minute: 0 });

      // THEN - Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should return failure if permission not granted', async () => {
      // GIVEN - Running on native but no permission
      mockIsNative.mockReturnValue(true);
      mockCanSchedule.mockResolvedValue(false);

      // WHEN - Attempting to schedule
      const result = await scheduleDailyNotification({ hour: 9, minute: 0 });

      // THEN - Should fail with permission error
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should schedule notification at specified time when permission granted', async () => {
      // GIVEN - Running on native with permission
      mockIsNative.mockReturnValue(true);
      mockCanSchedule.mockResolvedValue(true);
      mockSchedule.mockResolvedValue({ notifications: [{ id: NOTIFICATION_IDS.DAILY_CHALLENGE }] });

      // WHEN - Scheduling for 9:00 AM
      const result = await scheduleDailyNotification({ hour: 9, minute: 0 });

      // THEN - Should succeed and schedule correctly
      expect(result.success).toBe(true);
      expect(result.notificationId).toBe(NOTIFICATION_IDS.DAILY_CHALLENGE);
      expect(mockSchedule).toHaveBeenCalledTimes(1);

      // Verify schedule parameters
      const scheduleCall = mockSchedule.mock.calls[0][0];
      expect(scheduleCall.notifications).toHaveLength(1);
      expect(scheduleCall.notifications[0].id).toBe(NOTIFICATION_IDS.DAILY_CHALLENGE);
      expect(scheduleCall.notifications[0].schedule?.on?.hour).toBe(9);
      expect(scheduleCall.notifications[0].schedule?.on?.minute).toBe(0);
      expect(scheduleCall.notifications[0].schedule?.repeats).toBe(true);
    });

    it('should include letter hint when provided', async () => {
      // GIVEN - Running on native with permission
      mockIsNative.mockReturnValue(true);
      mockCanSchedule.mockResolvedValue(true);
      mockSchedule.mockResolvedValue({ notifications: [{ id: NOTIFICATION_IDS.DAILY_CHALLENGE }] });

      // WHEN - Scheduling with letter hint
      const result = await scheduleDailyNotification({ hour: 9, minute: 0, letterHint: 'S' });

      // THEN - Should succeed
      expect(result.success).toBe(true);

      // Verify the notification includes extra data with hint
      const scheduleCall = mockSchedule.mock.calls[0][0];
      expect(scheduleCall.notifications[0].extra?.letterHint).toBe('S');
    });

    it('should handle scheduling errors gracefully', async () => {
      // GIVEN - Running on native with permission but schedule fails
      mockIsNative.mockReturnValue(true);
      mockCanSchedule.mockResolvedValue(true);
      mockSchedule.mockRejectedValue(new Error('Schedule failed'));

      // WHEN - Attempting to schedule
      const result = await scheduleDailyNotification({ hour: 9, minute: 0 });

      // THEN - Should return failure
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('cancelDailyNotification', () => {
    it('should cancel the daily notification on native', async () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);
      mockCancel.mockResolvedValue(undefined);

      // WHEN - Canceling notification
      await cancelDailyNotification();

      // THEN - Should call cancel with correct ID
      expect(mockCancel).toHaveBeenCalledWith({
        notifications: [{ id: NOTIFICATION_IDS.DAILY_CHALLENGE }],
      });
    });

    it('should not throw on web platform', async () => {
      // GIVEN - Running on web
      mockIsNative.mockReturnValue(false);

      // WHEN - Canceling notification
      await expect(cancelDailyNotification()).resolves.not.toThrow();

      // THEN - Should not call cancel API
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('should handle cancel errors gracefully', async () => {
      // GIVEN - Running on native but cancel fails
      mockIsNative.mockReturnValue(true);
      mockCancel.mockRejectedValue(new Error('Cancel failed'));

      // WHEN - Attempting to cancel
      await expect(cancelDailyNotification()).resolves.not.toThrow();
    });
  });

  describe('getNextMessageIndex', () => {
    it('should return 0 when no previous index stored', () => {
      // GIVEN - No previous index
      (localStorage.getItem as any).mockReturnValue(null);

      // WHEN - Getting next index
      const index = getNextMessageIndex();

      // THEN - Should return 0
      expect(index).toBe(0);
    });

    it('should return next index in sequence', () => {
      // GIVEN - Previous index was 2
      (localStorage.getItem as any).mockReturnValue('2');

      // WHEN - Getting next index
      const index = getNextMessageIndex();

      // THEN - Should return 3
      expect(index).toBe(3);
    });

    it('should wrap around to 0 at end of messages array', () => {
      // GIVEN - Previous index was last in array
      const lastIndex = NOTIFICATION_MESSAGES.length - 1;
      (localStorage.getItem as any).mockReturnValue(String(lastIndex));

      // WHEN - Getting next index
      const index = getNextMessageIndex();

      // THEN - Should wrap to 0
      expect(index).toBe(0);
    });
  });

  describe('getRandomLetterHint', () => {
    it('should return a single uppercase letter', () => {
      // WHEN - Getting random letter
      const letter = getRandomLetterHint();

      // THEN - Should be single uppercase letter
      expect(letter).toMatch(/^[A-Z]$/);
    });

    it('should return different letters over multiple calls', () => {
      // WHEN - Getting multiple letters
      const letters = new Set<string>();
      for (let i = 0; i < 100; i++) {
        letters.add(getRandomLetterHint());
      }

      // THEN - Should have variety (at least 5 different letters)
      expect(letters.size).toBeGreaterThan(5);
    });
  });

  describe('buildNotificationContent', () => {
    it('should build content with title and body', () => {
      // GIVEN - Message index 0 (no letter hint)
      const messageIndex = 0;

      // WHEN - Building content
      const content = buildNotificationContent(messageIndex);

      // THEN - Should have title and body keys
      expect(content.titleKey).toBe(NOTIFICATION_MESSAGES[0].titleKey);
      expect(content.bodyKey).toBe(NOTIFICATION_MESSAGES[0].bodyKey);
    });

    it('should include letter hint for messages that support it', () => {
      // GIVEN - Find a message with letter hint
      const hintMessageIndex = NOTIFICATION_MESSAGES.findIndex((m) => m.hasLetterHint);
      expect(hintMessageIndex).toBeGreaterThanOrEqual(0); // Ensure we have hint messages

      // WHEN - Building content with letter hint
      const content = buildNotificationContent(hintMessageIndex, 'S');

      // THEN - Should include letter hint
      expect(content.letterHint).toBe('S');
    });

    it('should not include letter hint for messages that do not support it', () => {
      // GIVEN - Find a message without letter hint
      const noHintMessageIndex = NOTIFICATION_MESSAGES.findIndex((m) => !m.hasLetterHint);
      expect(noHintMessageIndex).toBeGreaterThanOrEqual(0);

      // WHEN - Building content even with letter hint provided
      const content = buildNotificationContent(noHintMessageIndex, 'S');

      // THEN - Should not include letter hint
      expect(content.letterHint).toBeUndefined();
    });
  });
});
