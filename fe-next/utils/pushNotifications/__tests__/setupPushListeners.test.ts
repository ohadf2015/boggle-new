/**
 * setupPushListeners foreground-display tests
 *
 * Bug: when app is in foreground, FCM fires `pushNotificationReceived` but
 * the Capacitor plugin does NOT render a system-tray notification for you.
 * Users reported no notification appeared for admin gifts even though FCM
 * reported success. Fix: schedule a LocalNotification inside the handler so
 * the push becomes visible regardless of app state.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupPushListeners } from '../tokenRegistration';

vi.mock('../../platform', () => ({
  isNative: vi.fn(() => true),
}));

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

type PushListener = (payload: unknown) => void;

const pushListeners: Record<string, PushListener> = {};
const mockPushAddListener = vi.fn(async (event: string, cb: PushListener) => {
  pushListeners[event] = cb;
  return { remove: vi.fn() };
});
const mockSchedule = vi.fn(async () => ({ notifications: [] }));

const localListeners: Record<string, PushListener> = {};
const mockLocalAddListener = vi.fn(async (event: string, cb: PushListener) => {
  localListeners[event] = cb;
  return { remove: vi.fn() };
});

describe('setupPushListeners — foreground display bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trackGrowthEvent.mockClear();
    for (const k of Object.keys(pushListeners)) delete pushListeners[k];
    for (const k of Object.keys(localListeners)) delete localListeners[k];

    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: {
        PushNotifications: { addListener: mockPushAddListener },
        LocalNotifications: { schedule: mockSchedule, addListener: mockLocalAddListener },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  it('schedules a LocalNotification when a push arrives in foreground', async () => {
    await setupPushListeners();

    const received = pushListeners['pushNotificationReceived'];
    expect(received).toBeDefined();

    received({
      title: "You've received a gift! 🎁",
      body: 'Tester sent you 50 coins!',
      data: { type: 'gift', actionUrl: '/' },
    });

    // Allow any promise in the handler to resolve
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const arg = mockSchedule.mock.calls[0][0] as { notifications: Array<{ title: string; body: string }> };
    expect(arg.notifications[0].title).toBe("You've received a gift! 🎁");
    expect(arg.notifications[0].body).toBe('Tester sent you 50 coins!');
  });

  it('still forwards data to onNotificationReceived callback', async () => {
    const cb = vi.fn();
    await setupPushListeners(cb);

    pushListeners['pushNotificationReceived']({
      title: 'T',
      body: 'B',
      data: { type: 'gift' },
    });
    await Promise.resolve();

    expect(cb).toHaveBeenCalledWith({ type: 'gift' });
  });

  it('does not schedule if title and body are both missing', async () => {
    await setupPushListeners();

    pushListeners['pushNotificationReceived']({ data: { type: 'silent' } });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('emits notification_delivered with type when push is received', async () => {
    await setupPushListeners();
    pushListeners['pushNotificationReceived']({
      title: 't', body: 'b',
      data: { type: 'daily_reminder', campaign: 'smart_reminder_v1' },
    });
    await Promise.resolve();

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'notification_delivered',
      expect.objectContaining({ type: 'daily_reminder', campaign: 'smart_reminder_v1' }),
    );
  });

  it('emits notification_clicked when user taps notification', async () => {
    await setupPushListeners();
    pushListeners['pushNotificationActionPerformed']({
      notification: { data: { type: 'gift', campaign: 'gift_received' } },
    });
    await Promise.resolve();

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'notification_clicked',
      expect.objectContaining({ type: 'gift', campaign: 'gift_received' }),
    );
  });

  // A push received while the app is FOREGROUND is re-displayed via
  // LocalNotifications.schedule (with the data copied into `extra`). Tapping
  // THAT notification fires `localNotificationActionPerformed`, NOT
  // `pushNotificationActionPerformed` — so without this listener the deep link
  // is silently dropped and the tap "doesn't redirect" (the reported bug).
  it('routes a tapped foreground-bridged (local) notification through onNotificationTapped', async () => {
    const onTapped = vi.fn();
    await setupPushListeners(undefined, onTapped);

    const localTap = localListeners['localNotificationActionPerformed'];
    expect(localTap).toBeDefined();

    localTap({
      notification: { extra: { type: 'daily_challenge', deepLink: '/daily?src=push&kind=rival' } },
    });
    await Promise.resolve();

    expect(onTapped).toHaveBeenCalledWith({ type: 'daily_challenge', deepLink: '/daily?src=push&kind=rival' });
  });

  it('emits notification_clicked for a local-notification tap too', async () => {
    await setupPushListeners();

    localListeners['localNotificationActionPerformed']({
      notification: { extra: { type: 'daily_challenge', campaign: 'smart_reminder_v1' } },
    });
    await Promise.resolve();

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'notification_clicked',
      expect.objectContaining({ type: 'daily_challenge', campaign: 'smart_reminder_v1' }),
    );
  });
});
