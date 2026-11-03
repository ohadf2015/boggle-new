import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerPushToken } from '../tokenRegistration';

vi.mock('../../platform', () => ({ isNative: vi.fn(() => true) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const remove = vi.fn();
const push = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  addListener: vi.fn(async () => ({ remove })),
  register: vi.fn(async () => {}),
};

describe('registerPushToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { Capacitor?: unknown }).Capacitor = { Plugins: { PushNotifications: push }, getPlatform: () => 'android' };
  });

  it('silent mode never raises the OS permission dialog', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'prompt' });
    expect(await registerPushToken({ silent: true })).toBe(false);
    expect(push.requestPermissions).not.toHaveBeenCalled();
    expect(push.register).not.toHaveBeenCalled();
  });

  it('default mode still asks (soft prompt path)', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'prompt' });
    push.requestPermissions.mockResolvedValue({ receive: 'denied' });
    await registerPushToken();
    expect(push.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls share one registration and leave no listeners behind', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'granted' });
    push.addListener.mockImplementation(async (event: string, cb: (e: unknown) => void) => {
      if (event === 'registrationError') setTimeout(() => cb({ error: 'x' }), 0);
      return { remove };
    });
    const [a, b] = await Promise.all([registerPushToken({ silent: true }), registerPushToken({ silent: true })]);
    expect(a).toBe(false);
    expect(b).toBe(false);
    expect(push.register).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('a registration timeout resolves false without raising a console error', async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    push.checkPermissions.mockResolvedValue({ receive: 'granted' });
    push.addListener.mockImplementation(async () => ({ remove }));
    const pending = registerPushToken({ silent: true });
    await vi.advanceTimersByTimeAsync(10001);
    expect(await pending).toBe(false);
    expect(err).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    err.mockRestore();
    warn.mockRestore();
    vi.useRealTimers();
  });
});
