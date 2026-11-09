import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const platform = { native: true, android: true };
vi.mock('@/utils/platform', () => ({
  isNative: () => platform.native,
  isAndroid: () => platform.android,
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

let downloaded: (() => void) | undefined;
const plugin = {
  check: vi.fn(async () => ({ started: true })),
  complete: vi.fn(async () => {}),
  addListener: vi.fn(async (_e: string, cb: () => void) => {
    downloaded = cb;
    return { remove: vi.fn() };
  }),
};
// Capacitor warns "already registered" on a second registration of the same name.
const registerPlugin = vi.fn((_name: string) => plugin);
vi.mock('@capacitor/core', () => ({ registerPlugin: (name: string) => registerPlugin(name) }));

let NativeUpdateSnackbar: typeof import('../NativeUpdateSnackbar').default;

describe('NativeUpdateSnackbar', () => {
  beforeEach(async () => {
    vi.resetModules();
    NativeUpdateSnackbar = (await import('../NativeUpdateSnackbar')).default;
    vi.useFakeTimers();
    vi.clearAllMocks();
    platform.native = true;
    platform.android = true;
    downloaded = undefined;
  });

  it('checks for an update on Android and shows a restart prompt once downloaded', async () => {
    render(<NativeUpdateSnackbar />);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(plugin.check).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => downloaded?.());
    fireEvent.click(screen.getByRole('button'));
    expect(plugin.complete).toHaveBeenCalledTimes(1);
  });

  it('does nothing on web or iOS', async () => {
    platform.native = false;
    render(<NativeUpdateSnackbar />);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(plugin.check).not.toHaveBeenCalled();
  });

  it('swallows plugin failures', async () => {
    plugin.check.mockRejectedValueOnce(new Error('no play'));
    render(<NativeUpdateSnackbar />);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('registers the plugin once across remounts', async () => {
    render(<NativeUpdateSnackbar />).unmount();
    render(<NativeUpdateSnackbar />);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(registerPlugin).toHaveBeenCalledTimes(1);
    expect(plugin.check).toHaveBeenCalledTimes(1);
  });
});
