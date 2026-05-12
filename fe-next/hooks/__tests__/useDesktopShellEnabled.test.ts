import { renderHook } from '@testing-library/react';
import { useDesktopShellEnabled } from '../useDesktopShellEnabled';

vi.mock('../useMediaQuery', () => ({
  useMediaQuery: vi.fn(),
}));
vi.mock('../useExperiment', () => ({
  useExperiment: vi.fn(),
}));

import { useMediaQuery } from '../useMediaQuery';
import { useExperiment } from '../useExperiment';

const mockExperiment = (variant: 'on' | 'off' | undefined) =>
  ({ variant, trackExposure: vi.fn() }) as unknown as ReturnType<typeof useExperiment>;

describe('useDesktopShellEnabled', () => {
  it('returns true at >=1024px AND flag is on', () => {
    (useMediaQuery as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(mockExperiment('on'));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(true);
    expect(useMediaQuery).toHaveBeenCalledWith('(min-width: 1024px)');
  });

  it('returns false below 1024px even if flag on', () => {
    (useMediaQuery as any).mockReturnValue(false);
    (useExperiment as any).mockReturnValue(mockExperiment('on'));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(false);
  });

  it('returns false when kill-switch flipped to off', () => {
    (useMediaQuery as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(mockExperiment('off'));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(false);
  });

  it('returns true when flag fetch fails (graceful default)', () => {
    (useMediaQuery as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(mockExperiment(undefined));
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(true);
  });
});
