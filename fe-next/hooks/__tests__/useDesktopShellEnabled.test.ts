import { renderHook } from '@testing-library/react';
import { useDesktopShellEnabled } from '../useDesktopShellEnabled';

vi.mock('../useMediaQuery', () => ({
  useIsDesktop: vi.fn(),
}));
vi.mock('../useExperiment', () => ({
  useExperiment: vi.fn(),
}));

import { useIsDesktop } from '../useMediaQuery';
import { useExperiment } from '../useExperiment';

const mockExperiment = (variant: 'on' | 'off' | undefined) =>
  ({ variant, trackExposure: vi.fn() }) as unknown as ReturnType<typeof useExperiment>;

describe('useDesktopShellEnabled', () => {
  it('returns true when desktop AND flag is on', () => {
    (useIsDesktop as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(mockExperiment('on'));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(true);
  });

  it('returns false on mobile even if flag on', () => {
    (useIsDesktop as any).mockReturnValue(false);
    (useExperiment as any).mockReturnValue(mockExperiment('on'));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(false);
  });

  it('returns false when kill-switch flipped to off', () => {
    (useIsDesktop as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(mockExperiment('off'));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(false);
  });

  it('returns true when flag fetch fails (graceful default)', () => {
    (useIsDesktop as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(mockExperiment(undefined));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(true);
  });
});
