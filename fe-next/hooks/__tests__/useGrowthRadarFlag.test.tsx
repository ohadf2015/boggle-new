import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGrowthRadarFlag } from '../useGrowthRadarFlag';

type Grq = { push: (cb: (gr: { getFlag: (key: string) => string | null }) => void) => void };

function installGr(getFlag: (key: string) => string | null) {
  (window as unknown as { grq: Grq }).grq = { push: (cb) => cb({ getFlag }) };
}

describe('useGrowthRadarFlag', () => {
  afterEach(() => {
    delete (window as unknown as { grq?: unknown }).grq;
  });

  it('returns the variant Growth Radar serves once flags are in', async () => {
    // Given gr.js has loaded and serves the treatment
    const getFlag = vi.fn(() => 'keep_name');
    installGr(getFlag);
    // When the hook is enabled
    const { result } = renderHook(() => useGrowthRadarFlag('daily-guest-name-skip'));
    // Then it resolves to the served variant
    await waitFor(() => expect(result.current).toBe('keep_name'));
    expect(getFlag).toHaveBeenCalledWith('daily-guest-name-skip');
  });

  it('does not read the flag (no exposure) while disabled', () => {
    const getFlag = vi.fn(() => 'keep_name');
    installGr(getFlag);
    const { result } = renderHook(() => useGrowthRadarFlag('daily-guest-name-skip', false));
    expect(result.current).toBeNull();
    expect(getFlag).not.toHaveBeenCalled();
  });

  it('queues on window.grq and stays null until gr.js loads', () => {
    const { result } = renderHook(() => useGrowthRadarFlag('daily-guest-name-skip'));
    expect(result.current).toBeNull();
    expect(Array.isArray((window as unknown as { grq?: unknown[] }).grq)).toBe(true);
    expect((window as unknown as { grq: unknown[] }).grq).toHaveLength(1);
  });
});
