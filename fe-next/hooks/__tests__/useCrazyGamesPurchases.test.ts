/**
 * useCrazyGamesPurchases hook tests
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockGetXsollaUserToken, mockTrackOrder } = vi.hoisted(() => {
  const mockGetXsollaUserToken = vi.fn();
  const mockTrackOrder = vi.fn();
  return { mockGetXsollaUserToken, mockTrackOrder };
});
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    getXsollaUserToken: mockGetXsollaUserToken,
    trackOrder: mockTrackOrder,
  }),
}));

import { useCrazyGamesPurchases } from '../useCrazyGamesPurchases';

describe('useCrazyGamesPurchases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports SDK as available', () => {
    const { result } = renderHook(() => useCrazyGamesPurchases());
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isProcessing).toBe(false);
  });

  it('getXsollaToken returns token from SDK', async () => {
    mockGetXsollaUserToken.mockResolvedValue('xsolla-token-abc');

    const { result } = renderHook(() => useCrazyGamesPurchases());

    let token: string | null = null;
    await act(async () => {
      token = await result.current.getXsollaToken();
    });

    expect(token).toBe('xsolla-token-abc');
    expect(mockGetXsollaUserToken).toHaveBeenCalledTimes(1);
  });

  it('getXsollaToken returns null on error', async () => {
    mockGetXsollaUserToken.mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useCrazyGamesPurchases());

    let token: string | null = 'initial';
    await act(async () => {
      token = await result.current.getXsollaToken();
    });

    expect(token).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });

  it('trackOrder sends order to SDK', async () => {
    mockTrackOrder.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCrazyGamesPurchases());

    let success = false;
    await act(async () => {
      success = await result.current.trackOrder('order-123');
    });

    expect(success).toBe(true);
    expect(mockTrackOrder).toHaveBeenCalledWith('xsolla', { orderId: 'order-123' });
  });

  it('trackOrder with extra data', async () => {
    mockTrackOrder.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCrazyGamesPurchases());

    await act(async () => {
      await result.current.trackOrder('order-456', { amount: 9.99, currency: 'USD' });
    });

    expect(mockTrackOrder).toHaveBeenCalledWith('xsolla', {
      orderId: 'order-456',
      amount: 9.99,
      currency: 'USD',
    });
  });

  it('trackOrder returns false on error', async () => {
    mockTrackOrder.mockRejectedValue(new Error('Track failed'));

    const { result } = renderHook(() => useCrazyGamesPurchases());

    let success = true;
    await act(async () => {
      success = await result.current.trackOrder('bad-order');
    });

    expect(success).toBe(false);
  });
});
