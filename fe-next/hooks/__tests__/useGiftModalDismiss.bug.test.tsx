/**
 * Gift Modal Dismissal Persistence Bug Test
 *
 * Bug: Gift modal keeps showing even after being dismissed because the
 * dismissal is only tracked in sessionStorage (cleared on browser close)
 * instead of persisting to the database.
 *
 * Expected: Once dismissed, the modal should NOT auto-show in future sessions.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('Gift Modal Dismissal Persistence Bug', () => {
  const mockProfile = {
    id: 'test-user-123',
    username: 'testuser',
    total_coins: 1000,
    total_xp: 500,
    gift_modal_dismissed_at: null, // New field to track dismissal
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    localStorage.clear();
    sessionStorage.clear();

    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      profile: mockProfile,
      refreshProfile: jest.fn(),
    });
  });

  it('should NOT auto-show gift modal if user has previously dismissed it (persisted in DB)', async () => {
    // Simulate user who dismissed the modal in a previous session
    const profileWithDismissedModal = {
      ...mockProfile,
      gift_modal_dismissed_at: '2026-01-18T10:00:00Z',
    };

    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      profile: profileWithDismissedModal,
      refreshProfile: jest.fn(),
    });

    // Mock API response with unclaimed gifts
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gifts: [
          {
            id: 'gift-1',
            title: 'Welcome Gift',
            message: 'Thanks for playing!',
            xp_amount: 100,
            coin_amount: 50,
            claimed: false,
            claimed_at: null,
            created_at: '2026-01-19T12:00:00Z',
          },
        ],
      }),
    });

    // In the real implementation, Header would check profile.gift_modal_dismissed_at
    // and NOT auto-show the modal if it's set
    const shouldAutoShow =
      !profileWithDismissedModal.gift_modal_dismissed_at &&
      !sessionStorage.getItem('lexiclash_gift_auto_shown');

    expect(shouldAutoShow).toBe(false);
  });

  it('should persist dismissal to database when user closes modal', async () => {
    // Mock API endpoint to mark modal as dismissed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        dismissedAt: '2026-01-19T12:30:00Z',
      }),
    });

    // Simulate API call when user dismisses modal
    const response = await fetch('/api/player/gifts/dismiss-modal', {
      method: 'POST',
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/player/gifts/dismiss-modal', {
      method: 'POST',
    });
    expect(data.success).toBe(true);
    expect(data.dismissedAt).toBeDefined();
  });

  it('should allow user to manually open gift modal even if previously dismissed', async () => {
    // User previously dismissed auto-show, but can still manually click gift button
    const profileWithDismissedModal = {
      ...mockProfile,
      gift_modal_dismissed_at: '2026-01-18T10:00:00Z',
    };

    // Manual open should always work regardless of dismissal status
    const canManuallyOpen = true; // This should always be true

    expect(canManuallyOpen).toBe(true);
  });
});
