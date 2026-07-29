/**
 * Push Notifications Module
 * Manages daily challenge reminders on native mobile platforms
 */

// Types
export * from './types';

// Category preferences
export {
  loadCategoryPreferences,
  saveCategoryPreferences,
  shouldShowPushPrompt,
  dismissPushPrompt,
  incrementGamesPlayed,
} from './categoryPreferences';

// Permission handling
export {
  checkNotificationPermission,
  requestNotificationPermission,
  canScheduleNotifications,
  ensureNotificationPermission,
} from './permissions';

// Scheduling
export {
  scheduleDailyNotification,
  cancelDailyNotification,
  hasPendingDailyNotification,
  rescheduleForTomorrow,
  getNextMessageIndex,
  getRandomLetterHint,
  buildNotificationContent,
} from './scheduler';

// Token registration (FCM)
export {
  registerPushToken,
  unregisterPushToken,
  setupPushListeners,
  isPushEnabled,
} from './tokenRegistration';
