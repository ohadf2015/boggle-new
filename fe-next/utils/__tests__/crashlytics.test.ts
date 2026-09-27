import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordExceptionMock = vi.fn();
const logMock = vi.fn();
const setUserIdMock = vi.fn();
const setCustomKeyMock = vi.fn();
const setEnabledMock = vi.fn();

vi.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    recordException: recordExceptionMock,
    log: logMock,
    setUserId: setUserIdMock,
    setCustomKey: setCustomKeyMock,
    setEnabled: setEnabledMock,
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('crashlytics wrapper', () => {
  it('records exceptions on native platforms', async () => {
    const { recordNativeError } = await import('../crashlytics');
    await recordNativeError(new Error('boom'), { screen: 'launch' });
    expect(recordExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' })
    );
    expect(setCustomKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'screen', value: 'launch' })
    );
  });

  it('initialize enables crashlytics and sets user', async () => {
    const { initCrashlytics } = await import('../crashlytics');
    await initCrashlytics('user-123');
    expect(setEnabledMock).toHaveBeenCalledWith({ enabled: true });
    expect(setUserIdMock).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('no-ops on web platform', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
    }));
    const { recordNativeError, initCrashlytics } = await import('../crashlytics');
    await recordNativeError(new Error('boom'));
    await initCrashlytics('user-1');
    expect(recordExceptionMock).not.toHaveBeenCalled();
    expect(setEnabledMock).not.toHaveBeenCalled();
  });

  it('swallows plugin errors so app launch never crashes from monitoring code', async () => {
    recordExceptionMock.mockRejectedValueOnce(new Error('plugin fail'));
    const { recordNativeError } = await import('../crashlytics');
    await expect(recordNativeError(new Error('boom'))).resolves.toBeUndefined();
  });
});
