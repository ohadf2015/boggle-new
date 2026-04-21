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

type PushListener = (payload: unknown) => void;

const pushListeners: Record<string, PushListener> = {};
const mockPushAddListener = vi.fn(async (event: string, cb: PushListener) => {
  pushListeners[event] = cb;
  return { remove: vi.fn() };
});
const mockSchedule = vi.fn(async () => ({ notifications: [] }));

describe('setupPushListeners — foreground display bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(pushListeners)) delete pushListeners[k];

    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: {
        PushNotifications: { addListener: mockPushAddListener },
        LocalNotifications: { schedule: mockSchedule },
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
});
