/**
 * Permission Handling Tests
 * Tests for push notification permission checking and requesting
 */

import {
  checkNotificationPermission,
  requestNotificationPermission,
  canScheduleNotifications,
} from '../permissions';
import type { PermissionResult } from '../types';

// Mock the platform utility
vi.mock('../../platform', () => ({
  isNative: vi.fn(),
}));

import { isNative } from '../../platform';

const mockIsNative = isNative as any;

// Mock functions for LocalNotifications
const mockCheckPermissions = vi.fn();
const mockRequestPermissions = vi.fn();

describe('Push Notification Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up globalThis.Capacitor with LocalNotifications plugin
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          checkPermissions: mockCheckPermissions,
          requestPermissions: mockRequestPermissions,
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  describe('checkNotificationPermission', () => {
    it('should return denied status on web platform', async () => {
      // GIVEN - Running on web
      mockIsNative.mockReturnValue(false);

      // WHEN - Checking permissions
      const result = await checkNotificationPermission();

      // THEN - Should indicate not available
      expect(result.status).toBe('denied');
      expect(result.canSchedule).toBe(false);
      expect(mockCheckPermissions).not.toHaveBeenCalled();
    });

    it('should return granted status when permission is granted on native', async () => {
      // GIVEN - Running on native with granted permission
      mockIsNative.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: 'granted' });

      // WHEN - Checking permissions
      const result = await checkNotificationPermission();

      // THEN - Should indicate granted
      expect(result.status).toBe('granted');
      expect(result.canSchedule).toBe(true);
    });

    it('should return prompt status when permission not yet requested', async () => {
      // GIVEN - Running on native, permission not yet requested
      mockIsNative.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: 'prompt' });

      // WHEN - Checking permissions
      const result = await checkNotificationPermission();

      // THEN - Should indicate prompt needed
      expect(result.status).toBe('prompt');
      expect(result.canSchedule).toBe(false);
    });

    it('should return denied status when permission denied', async () => {
      // GIVEN - Running on native, permission denied
      mockIsNative.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: 'denied' });

      // WHEN - Checking permissions
      const result = await checkNotificationPermission();

      // THEN - Should indicate denied
      expect(result.status).toBe('denied');
      expect(result.canSchedule).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // GIVEN - Running on native but API throws error
      mockIsNative.mockReturnValue(true);
      mockCheckPermissions.mockRejectedValue(new Error('Plugin not available'));

      // WHEN - Checking permissions
      const result = await checkNotificationPermission();

      // THEN - Should return denied safely
      expect(result.status).toBe('denied');
      expect(result.canSchedule).toBe(false);
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return denied on web platform without calling API', async () => {
      // GIVEN - Running on web
      mockIsNative.mockReturnValue(false);

      // WHEN - Requesting permissions
      const result = await requestNotificationPermission();

      // THEN - Should indicate not available
      expect(result.status).toBe('denied');
      expect(result.canSchedule).toBe(false);
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('should request and return granted when user accepts', async () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);
      mockRequestPermissions.mockResolvedValue({ display: 'granted' });

      // WHEN - Requesting permissions
      const result = await requestNotificationPermission();

      // THEN - Should be granted
      expect(result.status).toBe('granted');
      expect(result.canSchedule).toBe(true);
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });

    it('should return denied when user rejects', async () => {
      // GIVEN - Running on native
      mockIsNative.mockReturnValue(true);
      mockRequestPermissions.mockResolvedValue({ display: 'denied' });

      // WHEN - Requesting permissions
      const result = await requestNotificationPermission();

      // THEN - Should be denied
      expect(result.status).toBe('denied');
      expect(result.canSchedule).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // GIVEN - Running on native but API throws
      mockIsNative.mockReturnValue(true);
      mockRequestPermissions.mockRejectedValue(new Error('User cancelled'));

      // WHEN - Requesting permissions
      const result = await requestNotificationPermission();

      // THEN - Should return denied safely
      expect(result.status).toBe('denied');
      expect(result.canSchedule).toBe(false);
    });
  });

  describe('canScheduleNotifications', () => {
    it('should return false on web platform', async () => {
      // GIVEN - Running on web
      mockIsNative.mockReturnValue(false);

      // WHEN - Checking if can schedule
      const canSchedule = await canScheduleNotifications();

      // THEN - Should be false
      expect(canSchedule).toBe(false);
    });

    it('should return true when permission is granted on native', async () => {
      // GIVEN - Running on native with granted permission
      mockIsNative.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: 'granted' });

      // WHEN - Checking if can schedule
      const canSchedule = await canScheduleNotifications();

      // THEN - Should be true
      expect(canSchedule).toBe(true);
    });

    it('should return false when permission is not granted', async () => {
      // GIVEN - Running on native with prompt status
      mockIsNative.mockReturnValue(true);
      mockCheckPermissions.mockResolvedValue({ display: 'prompt' });

      // WHEN - Checking if can schedule
      const canSchedule = await canScheduleNotifications();

      // THEN - Should be false (need to request first)
      expect(canSchedule).toBe(false);
    });
  });
});
