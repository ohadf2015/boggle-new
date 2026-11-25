/**
 * The native plugin (presentationOptions includes 'alert') already shows a
 * foreground push in the tray; scheduling a local copy shows it twice.
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

describe('setupPushListeners', () => {
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

  it('does not add a local copy of a foreground push (native already displays it)', async () => {
    await setupPushListeners();

    pushListeners['pushNotificationReceived']({
      title: "You've received a gift! 🎁",
      body: 'Tester sent you 50 coins!',
      data: { type: 'gift', actionUrl: '/' },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSchedule).not.toHaveBeenCalled();
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

  // Cold-start contract: the native plugin fires `pushNotificationActionPerformed`
  // with retainUntilConsumed=true (PushNotificationsPlugin.java:74 /
  // PushNotificationsHandler.swift:75), so a tap on a killed-app push is BUFFERED
  // by Capacitor and replayed to the first listener `addListener` registers
  // (Plugin.java addEventListener → sendRetainedArgumentsForEvent). This test
  // locks the JS side of that contract: our listener must forward the tapped
  // payload (incl. deepLink) to onNotificationTapped so the replay actually
  // routes. If this regresses, cold-start deep links silently stop working.
  it('forwards a tapped (background/cold-start) push payload to onNotificationTapped', async () => {
    const onTapped = vi.fn();
    await setupPushListeners(undefined, onTapped);

    pushListeners['pushNotificationActionPerformed']({
      notification: { data: { type: 'daily_challenge', deepLink: '/daily?src=push&kind=rival&dir=above' } },
    });
    await Promise.resolve();

    expect(onTapped).toHaveBeenCalledWith({ type: 'daily_challenge', deepLink: '/daily?src=push&kind=rival&dir=above' });
  });

  // Local reminders from scheduler.ts carry their deep link in `extra`.
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
