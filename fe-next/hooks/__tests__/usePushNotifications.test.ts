/**
 * usePushNotifications Hook Tests
 * Tests for the push notification management hook
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';
import type { PushNotificationPreferences } from '@/utils/pushNotifications/types';

// Mock platform utility
vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(),
}));

// Mock push notification utilities
vi.mock('@/utils/pushNotifications', () => ({
  checkNotificationPermission: vi.fn(),
  requestNotificationPermission: vi.fn(),
  scheduleDailyNotification: vi.fn(),
  cancelDailyNotification: vi.fn(),
  hasPendingDailyNotification: vi.fn(),
  DEFAULT_PUSH_PREFERENCES: {
    enabled: true,
    hour: 9,
    minute: 0,
  },
}));

import { isNative } from '@/utils/platform';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleDailyNotification,
  cancelDailyNotification,
  hasPendingDailyNotification,
} from '@/utils/pushNotifications';

const mockIsNative = isNative as any;
const mockCheckPermission = checkNotificationPermission as any;
const mockRequestPermission = requestNotificationPermission as any;
const mockSchedule = scheduleDailyNotification as any;
const mockCancel = cancelDailyNotification as any;
const mockHasPending = hasPendingDailyNotification as any;

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to web platform
    mockIsNative.mockReturnValue(false);
    mockCheckPermission.mockResolvedValue({ status: 'denied', canSchedule: false });
    mockHasPending.mockResolvedValue(false);
  });

  describe('initialization', () => {
    it('should return isAvailable as false on web platform', () => {
      // GIVEN - Running on web
      mockIsNative.mockReturnValue(false);

      // WHEN - Hook is rendered
      const { result } = renderHook(() => usePushNotifications());

      // THEN - Should indicate not available
      expect(result.current.isAvailable).toBe(false);
    });

    it('should return isAvailable as true on native platform', () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });

      // WHEN - Hook is rendered
      const { result } = renderHook(() => usePushNotifications());

      // THEN - Should indicate available
      expect(result.current.isAvailable).toBe(true);
    });

    it('should check permission status on mount', async () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });

      // WHEN - Hook is rendered
      renderHook(() => usePushNotifications());

      // THEN - Should check permissions
      await waitFor(() => {
        expect(mockCheckPermission).toHaveBeenCalled();
      });
    });

    it('should return default preferences initially', () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);

      // WHEN - Hook is rendered
      const { result } = renderHook(() => usePushNotifications());

      // THEN - Should have default preferences
      expect(result.current.preferences.enabled).toBe(true);
      expect(result.current.preferences.hour).toBe(9);
      expect(result.current.preferences.minute).toBe(0);
    });
  });

  describe('permission handling', () => {
    it('should return correct permission status', async () => {
      // GIVEN - Running on native with granted permission
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });

      // WHEN - Hook is rendered
      const { result } = renderHook(() => usePushNotifications());

      // THEN - Should show granted status
      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('granted');
      });
    });

    it('should request permission when requestPermission is called', async () => {
      // GIVEN - Running on native with prompt status
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'prompt', canSchedule: false });
      mockRequestPermission.mockResolvedValue({ status: 'granted', canSchedule: true });

      // WHEN - Hook is rendered and permission requested
      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        const granted = await result.current.requestPermission();
        expect(granted).toBe(true);
      });

      // THEN - Should have requested permission
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('enabling notifications', () => {
    it('should schedule notification when enabling', async () => {
      // GIVEN - Running on native with permission
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });
      mockSchedule.mockResolvedValue({ success: true, notificationId: 1001 });

      // WHEN - Hook is rendered and notifications enabled
      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.setEnabled(true);
      });

      // THEN - Should schedule notification
      await waitFor(() => {
        expect(mockSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            hour: 9,
            minute: 0,
          })
        );
      });
    });

    it('should cancel notification when disabling', async () => {
      // GIVEN - Running on native with permission and enabled
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });
      mockCancel.mockResolvedValue(undefined);

      // WHEN - Hook is rendered and notifications disabled
      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.setEnabled(false);
      });

      // THEN - Should cancel notification
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('time preference', () => {
    it('should update schedule when time is changed', async () => {
      // GIVEN - Running on native with permission and enabled
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });
      mockSchedule.mockResolvedValue({ success: true, notificationId: 1001 });

      // WHEN - Hook is rendered and time changed
      const { result } = renderHook(() => usePushNotifications());

      // First enable
      await act(async () => {
        await result.current.setEnabled(true);
      });

      // Clear mock calls
      mockSchedule.mockClear();

      // Then change time
      await act(async () => {
        await result.current.setTime(10, 30);
      });

      // THEN - Should reschedule with new time
      await waitFor(() => {
        expect(mockSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            hour: 10,
            minute: 30,
          })
        );
      });
    });

    it('should not schedule when changing time if disabled', async () => {
      // GIVEN - Running on native with permission but disabled
      mockIsNative.mockReturnValue(true);
      mockCheckPermission.mockResolvedValue({ status: 'granted', canSchedule: true });

      // WHEN - Hook is rendered and time changed while disabled
      const { result } = renderHook(() => usePushNotifications());

      // Disable first
      await act(async () => {
        await result.current.setEnabled(false);
      });

      mockSchedule.mockClear();

      // Change time
      await act(async () => {
        await result.current.setTime(10, 30);
      });

      // THEN - Should not schedule
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe('smart skip', () => {
    it('should provide markChallengeCompleted method', () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);

      // WHEN - Hook is rendered
      const { result } = renderHook(() => usePushNotifications());

      // THEN - Should have the method
      expect(typeof result.current.markChallengeCompleted).toBe('function');
    });
  });
});
