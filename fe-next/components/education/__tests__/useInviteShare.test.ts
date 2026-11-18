// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInviteShare } from '../useInviteShare';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduJoinCodeCopied: vi.fn(), trackEduJoinCodeShared: vi.fn() }));
const shareWithFallback = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => shareWithFallback(...a) }));

const payload = { url: 'https://x.test/join/ABC123', text: 'join' };
const classroom = { id: 'c1', name: 'Class' };
const t = (k: string) => k;

function hook(onShared: () => void) {
  return renderHook(() => useInviteShare(classroom, t, onShared)).result;
}

describe('useInviteShare records a real share only', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a working clipboard WHEN the teacher copies THEN the invite counts as shared', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const onShared = vi.fn();
    const result = hook(onShared);
    await act(() => result.current('copy', payload));
    expect(onShared).toHaveBeenCalledTimes(1);
  });

  it('GIVEN a blocked clipboard WHEN the teacher copies THEN nothing counts as shared', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } });
    const onShared = vi.fn();
    const result = hook(onShared);
    await act(() => result.current('copy', payload));
    expect(onShared).not.toHaveBeenCalled();
  });

  it('GIVEN WhatsApp WHEN tapped THEN the invite counts as shared', async () => {
    const onShared = vi.fn();
    const result = hook(onShared);
    await act(() => result.current('whatsapp', payload));
    expect(onShared).toHaveBeenCalledTimes(1);
  });

  it('GIVEN the share sheet is dismissed WHEN it fails THEN nothing counts as shared', async () => {
    shareWithFallback.mockResolvedValue('failed');
    const onShared = vi.fn();
    const result = hook(onShared);
    await act(() => result.current('native' as never, payload));
    expect(onShared).not.toHaveBeenCalled();
  });
});
